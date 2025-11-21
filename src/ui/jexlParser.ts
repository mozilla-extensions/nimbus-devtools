import { elements as grammar } from "mozjexl/lib/grammar";
import Lexer from "mozjexl/lib/Lexer";
import Parser from "mozjexl/lib/parser/Parser";

type BinaryExpression = {
  type: "BinaryExpression" | "LogicalExpression";
  left: ASTNode;
  right: ASTNode;
  operator: string;
};

type UnaryExpression = {
  type: "UnaryExpression";
  operator: string;
  right: ASTNode;
};

type Transform = {
  type: "Transform";
  name: string;
  subject: ASTNode;
  args: ASTNode[];
};

type FilterExpression = {
  type: "FilterExpression";
  subject: ASTNode;
  expr: ASTNode;
};

type Literal = {
  type: "Literal";
  value: string | number | boolean | null;
};

type Identifier = {
  type: "Identifier";
  value: string;
  from?: Identifier;
};

type ArrayLiteral = {
  type: "ArrayLiteral";
  value: ASTNode[];
};

type ObjectLiteral = {
  type: "ObjectLiteral";
  value: { [key: string]: ASTNode };
};

export type ASTNode =
  | BinaryExpression
  | UnaryExpression
  | Transform
  | FilterExpression
  | Literal
  | Identifier
  | ArrayLiteral
  | ObjectLiteral;

/**
 * Evaluates a JEXL expression within a given context.
 * @param {string} expression - The JEXL expression to evaluate.
 * @param {object} context - The context in which to evaluate the expression.
 * @returns {Promise<string>} - The result of the evaluation as a string.
 */
export async function evaluateJexl(
  expression: string,
  context: object = {},
): Promise<string> {
  const lexer = new Lexer(grammar);
  const parser = new Parser(grammar);

  parser.addTokens(lexer.tokenize(expression));
  const ast = parser.complete();
  const falseParts: string[] = [];

  await traverseAst(ast, context, falseParts);

  const finalResult = await evaluateExpression(expression, context);
  const falsePartsStr = !finalResult
    ? `\n\nFalse Parts:\n${falseParts.join("\n")}`
    : "";
  return `${JSON.stringify(finalResult, null, 2)}${falsePartsStr}`;
}

/**
 * Evaluates a JEXL expression using the browser's Nimbus API.
 * @param {string} expression - The JEXL expression to evaluate.
 * @param {object} context - The context in which to evaluate the expression.
 * @returns {Promise<object|boolean>} - The result of the evaluation.
 */
async function evaluateExpression(
  expression: string,
  context: object,
): Promise<object | boolean> {
  try {
    return await browser.experiments.nimbus.evaluateJEXL(expression, context);
  } catch (error) {
    console.error(`Error evaluating part "${expression}":`, error);
    throw error;
  }
}

/**
 * Traverses the AST to evaluate sub-expressions and collect parts that evaluate to false.
 * @param {ASTNode} ast - The AST node to traverse.
 * @param {object} context - The context in which to evaluate the expressions.
 * @param {string[]} falseParts - An array to collect expressions that evaluate to false.
 * @returns {Promise<unknown>} - The result of the traversal.
 */
async function traverseAst(
  ast: ASTNode,
  context: object,
  falseParts: string[],
): Promise<unknown> {
  if (!ast) {
    return true;
  }

  const subExpr = await getExpression(ast);
  const result = await evaluateExpression(subExpr, context);

  if (ast.type === "BinaryExpression" || ast.type === "LogicalExpression") {
    const leftResult = await evaluateExpression(
      await getExpression(ast.left),
      context,
    );
    const rightResult = await evaluateExpression(
      await getExpression(ast.right),
      context,
    );

    if (result === false && leftResult !== false && rightResult !== false) {
      falseParts.push(subExpr);
    } else {
      if (ast.left) {
        await traverseAst(ast.left, context, falseParts);
      }
      if (ast.right) {
        await traverseAst(ast.right, context, falseParts);
      }
    }
  } else if (ast.type === "UnaryExpression") {
    const rightResult = await evaluateExpression(
      await getExpression(ast.right),
      context,
    );
    if (result === false && rightResult !== false) {
      falseParts.push(subExpr);
      if (ast.right) {
        await traverseAst(ast.right, context, falseParts);
      }
    } else {
      if (ast.right) {
        await traverseAst(ast.right, context, falseParts);
      }
    }
  } else if (ast.type === "Transform") {
    if (result === false) {
      falseParts.push(subExpr);
    } else {
      if (ast.subject) {
        await traverseAst(ast.subject, context, falseParts);
      }
      if (ast.args) {
        for (const arg of ast.args) {
          await traverseAst(arg, context, falseParts);
        }
      }
    }
  } else if (ast.type === "FilterExpression") {
    if (result === false) {
      falseParts.push(subExpr);
    } else {
      if (ast.subject) {
        await traverseAst(ast.subject, context, falseParts);
      }
      if (ast.expr) {
        await traverseAst(ast.expr, context, falseParts);
      }
    }
  } else if (ast.type === "Literal" || ast.type === "Identifier") {
    if (result === false) {
      falseParts.push(subExpr);
    }
  } else if (ast.type === "ObjectLiteral") {
    if (result === false) {
      falseParts.push(subExpr);
    } else {
      for (const key in ast.value) {
        await traverseAst(ast.value[key], context, falseParts);
      }
    }
  }

  return result;
}

/**
 * Retrieves the full identifier string from an AST node.
 * @param {Identifier} ast - The AST node representing an identifier.
 * @returns {string} - The full identifier string.
 */
function getFullIdentifier(ast: Identifier): string {
  if (!ast.from) {
    return ast.value;
  }
  return `${getFullIdentifier(ast.from)}.${ast.value}`;
}

/**
 * Converts an AST node to its corresponding JEXL expression string.
 * @param {ASTNode} ast - The AST node to convert.
 * @returns {Promise<string>} - The JEXL expression string.
 */
async function getExpression(ast: ASTNode): Promise<string> {
  if (!ast) {
    return "";
  }

  if (ast.type === "BinaryExpression" || ast.type === "LogicalExpression") {
    const leftExpr = await getExpression(ast.left);
    const rightExpr = await getExpression(ast.right);
    const leftWrapped =
      ast.left.type === "Literal" ||
      ast.left.type === "Identifier" ||
      ast.left.type === "ArrayLiteral"
        ? leftExpr
        : `(${leftExpr})`;
    const rightWrapped =
      ast.right.type === "Literal" ||
      ast.right.type === "Identifier" ||
      ast.right.type === "ArrayLiteral"
        ? rightExpr
        : `(${rightExpr})`;
    return `${leftWrapped} ${ast.operator} ${rightWrapped}`;
  } else if (ast.type === "UnaryExpression") {
    const rightExpr = await getExpression(ast.right);
    return `${ast.operator}(${rightExpr})`;
  } else if (ast.type === "Transform") {
    const subjectExpr = await getExpression(ast.subject);
    const argsExpr = ast.args
      ? (await Promise.all(ast.args.map(getExpression))).join(", ")
      : "";
    return argsExpr.length === 0
      ? `${subjectExpr}|${ast.name}`
      : `${subjectExpr}|${ast.name}(${argsExpr})`;
  } else if (ast.type === "FilterExpression") {
    const subjectExpr = await getExpression(ast.subject);
    const filterExpr = await getExpression(ast.expr);
    return `${subjectExpr}[${filterExpr}]`;
  } else if (ast.type === "Literal") {
    return typeof ast.value === "string" ? `'${ast.value}'` : `${ast.value}`;
  } else if (ast.type === "Identifier") {
    return getFullIdentifier(ast);
  } else if (ast.type === "ArrayLiteral") {
    const elementsExpr = (await Promise.all(ast.value.map(getExpression))).join(
      ", ",
    );
    return `[${elementsExpr}]`;
  } else if (ast.type === "ObjectLiteral") {
    const entries = Object.entries(ast.value);
    const objectExpr = await Promise.all(
      entries.map(async ([key, value]) => {
        const valueExpr = await getExpression(value);
        if (value.type === "ObjectLiteral") {
          const nestedEntries = Object.entries(value.value);
          const nestedObjectExpr = await Promise.all(
            nestedEntries.map(async ([nestedKey, nestedValue]) => {
              const nestedValueExpr = await getExpression(nestedValue);
              return `${nestedKey}: ${nestedValueExpr}`;
            }),
          );
          return `${key}: { ${nestedObjectExpr.join(", ")} }`;
        }
        return `${key}: ${valueExpr}`;
      }),
    );
    return `{ ${objectExpr.join(", ")} }`;
  }
  return "";
}
