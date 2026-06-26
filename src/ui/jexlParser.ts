import { elements as baseGrammar } from "mozjexl/lib/grammar";
import Lexer from "mozjexl/lib/Lexer";
import Parser, { ASTNode, Identifier } from "mozjexl/lib/parser/Parser";

const grammar = {
  ...baseGrammar,

  // See-also https://searchfox.org/firefox-main/rev/8ce9d585aca55919997d1a05506c69e309369167/toolkit/components/utils/FilterExpressions.sys.mjs#48
  intersect: {
    type: "binaryOp",
    precedence: 40,
    eval: function intersect(a: unknown, b: unknown): undefined | unknown[] {
      if (!Array.isArray(a) || !Array.isArray(b)) {
        return undefined;
      }

      return a.filter((item) => b.includes(item)) as unknown[];
    },
  },
};

type DebugContext = {
  falseExprs: string[];
  attrs: Set<string>;
  prefs: Set<string>;
};

export type DebugJexlResult = DebugContext & {
  value: string;
};

/**
 * Evaluates a JEXL expression within a given context.
 *
 * @param expression The JEXL expression to evaluate.
 * @param context The context in which to evaluate the expression.
 *
 * @returns The result of the evaluation as a string.
 */
export async function debugJexl(
  expression: string,
  context: object = {},
): Promise<DebugJexlResult> {
  if (!expression.trim()) {
    throw new Error("Empty expression");
  }

  const value = await evaluateExpression(expression, context);

  const lexer = new Lexer(grammar);
  const parser = new Parser(grammar);

  parser.addTokens(lexer.tokenize(expression));

  const debugCtx = {
    falseExprs: [],
    attrs: new Set(),
    prefs: new Set(),
  } as DebugContext;

  const ast = parser.complete();

  await collectFalseExprs(ast, context, debugCtx.falseExprs);
  collectAttrsAndPrefs(ast, debugCtx);

  return {
    ...debugCtx,
    value:
      typeof value === "undefined"
        ? "undefined"
        : typeof value === "string"
          ? quoteString(value)
          : JSON.stringify(value, null, 2),
  };
}

/**
 * Debug a JEXL expression using the browser's Nimbus API.
 *
 * @param expression - The JEXL expression to evaluate.
 * @param context - The context in which to evaluate the expression.
 *
 * @returns Debugging information about the expression.
 */
async function evaluateExpression(
  expression: string,
  context: object,
): Promise<unknown> {
  try {
    return await browser.experiments.nimbus.evaluateJEXL(expression, context);
  } catch (error) {
    console.error(
      `Error evaluating expression ${quoteString(expression)}:`,
      error,
    );
    throw error;
  }
}

/**
 * Traverses the AST to evaluate sub-expressions and collect parts that evaluate to false.
 *
 * @param ast The AST node to traverse.
 * @param context The context in which to evaluate the expressions.
 * @param falseExprs An array to collect expressions that evaluate to false.
 *
 * @returns The result of the traversal.
 */
async function collectFalseExprs(
  ast: ASTNode,
  context: object,
  falseExprs: string[],
): Promise<unknown> {
  const subExpr = getExpression(ast);
  const result = await evaluateExpression(subExpr, context);

  if (ast.type === "BinaryExpression" || ast.type === "LogicalExpression") {
    const leftResult = await evaluateExpression(
      getExpression(ast.left),
      context,
    );
    const rightResult = await evaluateExpression(
      getExpression(ast.right),
      context,
    );

    if (result === false && leftResult !== false && rightResult !== false) {
      falseExprs.push(subExpr);
    } else {
      if (ast.left) {
        await collectFalseExprs(ast.left, context, falseExprs);
      }
      if (ast.right) {
        await collectFalseExprs(ast.right, context, falseExprs);
      }
    }
  } else if (ast.type === "UnaryExpression") {
    const rightResult = await evaluateExpression(
      getExpression(ast.right),
      context,
    );
    if (result === false && rightResult !== false) {
      falseExprs.push(subExpr);
      if (ast.right) {
        await collectFalseExprs(ast.right, context, falseExprs);
      }
    } else {
      if (ast.right) {
        await collectFalseExprs(ast.right, context, falseExprs);
      }
    }
  } else if (ast.type === "Transform") {
    if (result === false) {
      falseExprs.push(subExpr);
    } else {
      if (ast.subject) {
        await collectFalseExprs(ast.subject, context, falseExprs);
      }
      if (ast.args) {
        for (const arg of ast.args) {
          await collectFalseExprs(arg, context, falseExprs);
        }
      }
    }
  } else if (ast.type === "FilterExpression") {
    if (result === false) {
      falseExprs.push(subExpr);
    } else {
      if (ast.subject) {
        await collectFalseExprs(ast.subject, context, falseExprs);
      }
      if (ast.expr) {
        await collectFalseExprs(ast.expr, context, falseExprs);
      }
    }
  } else if (ast.type === "Literal" || ast.type === "Identifier") {
    if (result === false) {
      falseExprs.push(subExpr);
    }
  } else if (ast.type === "ObjectLiteral") {
    if (result === false) {
      falseExprs.push(subExpr);
    } else {
      for (const key in ast.value) {
        await collectFalseExprs(ast.value[key], context, falseExprs);
      }
    }
  }

  return result;
}

function collectAttrsAndPrefs(ast: ASTNode, debugCtx: DebugContext) {
  switch (ast.type) {
    case "BinaryExpression":
    case "LogicalExpression":
      collectAttrsAndPrefs(ast.left, debugCtx);
      collectAttrsAndPrefs(ast.right, debugCtx);
      break;

    case "UnaryExpression":
      collectAttrsAndPrefs(ast.right, debugCtx);
      break;

    case "Transform":
      if (
        ast.name === "preferenceValue" &&
        ast.subject.type === "Literal" &&
        typeof ast.subject.value === "string"
      ) {
        debugCtx.prefs.add(ast.subject.value);
      } else {
        collectAttrsAndPrefs(ast.subject, debugCtx);
      }
      break;

    case "FilterExpression":
      collectAttrsAndPrefs(ast.expr, debugCtx);
      collectAttrsAndPrefs(ast.subject, debugCtx);
      break;

    case "Identifier":
      {
        const attr = getRootAttribute(ast);
        if (attr) {
          debugCtx.attrs.add(attr);
        }
      }
      break;

    case "ObjectLiteral":
      for (const valueNode of Object.values(ast.value)) {
        collectAttrsAndPrefs(valueNode, debugCtx);
      }
      break;

    case "ArrayLiteral":
      for (const itemNode of ast.value) {
        collectAttrsAndPrefs(itemNode, debugCtx);
      }
      break;

    case "Literal":
      break;

    default:
      // TypeScript correctly deduces `ast: never`, so we have to re-cast it to an
      // ASTNode to print this error.
      throw new TypeError(`Unexpected AST node type ${(ast as ASTNode).type}`);
  }
}

/**
 * Return the root attribute of a given indentifier, if it exists.
 *
 * For example, for the identifier "foo.bar.baz", this will return "foo".
 *
 * However, for an identifier on, e.g., an object or array literal, this will
 * return null.
 *
 * @param ast The AST node for the identifier.
 *
 * @returns The root identifier
 * */
function getRootAttribute(ast: Identifier): string | null {
  if (!ast.from) {
    return ast.value;
  }

  if (ast.from.type === "Identifier") {
    return getRootAttribute(ast.from);
  }

  return null;
}

/**
 * Converts an AST node to its corresponding JEXL expression string.
 *
 * @param ast The AST node to convert.
 *
 * @returns The JEXL expression string.
 */
function getExpression(ast: ASTNode): string {
  if (!ast) {
    return "";
  }

  if (ast.type === "BinaryExpression" || ast.type === "LogicalExpression") {
    const leftExpr = getExpression(ast.left);
    const rightExpr = getExpression(ast.right);
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
    const rightExpr = getExpression(ast.right);
    return `${ast.operator}(${rightExpr})`;
  } else if (ast.type === "Transform") {
    const subjectExpr = getExpression(ast.subject);
    const argsExpr = ast.args ? ast.args.map(getExpression).join(", ") : "";
    return argsExpr.length === 0
      ? `${subjectExpr}|${ast.name}`
      : `${subjectExpr}|${ast.name}(${argsExpr})`;
  } else if (ast.type === "FilterExpression") {
    const subjectExpr = getExpression(ast.subject);
    const filterExpr = getExpression(ast.expr);
    return `${subjectExpr}[${filterExpr}]`;
  } else if (ast.type === "Literal") {
    return typeof ast.value === "string"
      ? quoteString(ast.value)
      : `${ast.value}`;
  } else if (ast.type === "Identifier") {
    if (ast.from) {
      return getExpression(ast.from) + "." + ast.value;
    }
    return ast.value;
  } else if (ast.type === "ArrayLiteral") {
    const elementsExpr = ast.value.map(getExpression).join(", ");
    return `[${elementsExpr}]`;
  } else if (ast.type === "ObjectLiteral") {
    const entries = Object.entries(ast.value);
    const objectExpr = entries.map(([key, value]) => {
      const valueExpr = getExpression(value);
      return `${key}: ${valueExpr}`;
    });
    return `{ ${objectExpr.join(", ")} }`;
  }
  return "";
}

/**
 * Quote a string so that it is re-parseable by mozjexl.
 *
 * @param s The string to quote.
 *
 * @returns A quoted version of the given string.
 */
function quoteString(s: string) {
  // If the string does not include both types of quotes, it is easy to re-quote.
  if (!s.includes(`"`)) {
    return `"${s}"`;
  }

  if (!s.includes(`'`)) {
    return `'${s}'`;
  }

  // However, if it does contain both types of quotes, then we must pick one and
  // escape every unescaped instance of that quote inside `s`.
  //
  // A quote is unescaped if it is preceded by an even number of backslashes
  // (including 0).

  // The mozjexl lexer does not accept a string of the form `"\""`, so we need
  // to escape all the single quotes within s and surround it with single
  // quotes.
  if (s.endsWith(`"`)) {
    return `'` + s.replaceAll(/(\\\\)*'/g, `$1\\'`) + `'`;
  }

  return `"` + s.replaceAll(/(\\\\)*"/g, `$1\\"`) + `"`;
}
