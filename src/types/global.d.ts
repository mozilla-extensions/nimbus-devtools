/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "mozjexl/lib/grammar" {
  export type GrammarItem = {
    type: string;
    precedence?: number;
    eval?: (
      left: boolean | number | string,
      right?: boolean | number | string,
    ) => boolean | number | string;
  };

  export type Grammar = {
    elements: {
      [key: string]: GrammarItem;
    };
  };

  export type Token = {
    type: string;
    name?: string;
    value: boolean | number | string;
    raw: string;
  };

  export const elements: Grammar;
}

declare module "mozjexl/lib/Lexer" {
  import { Grammar, Token } from "mozjexl/lib/grammar";

  export default class Lexer {
    constructor(grammar: Grammar);
    tokenize(expression: string): Token[];
  }
}

declare module "mozjexl/lib/parser/Parser" {
  import { Grammar, Token } from "mozjexl/lib/grammar";

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

  export default class Parser {
    constructor(grammar: Grammar);
    addTokens(tokens: Token[]): void;
    complete(): ASTNode;
  }
}

type EnrollInExperimentResult =
  | {
      enrolled: true;
      error: null;
    }
  | {
      enrolled: false;
      error: {
        slugExistsInStore: boolean;
        activeEnrollment: string | null;
      };
    };

declare namespace browser.experiments.nimbus {
  function enrollInExperiment(
    jsonData: object,
    forceEnroll: boolean,
  ): Promise<EnrollInExperimentResult>;

  function enrollWithFeatureConfig(
    featureId: string,
    featureValue: object,
    isRollout: boolean,
    forceEnroll: boolean,
  ): Promise<EnrollInExperimentResult>;

  function getFeatureConfigs(): Promise<string[]>;

  function getCurrentCollection(): Promise<string>;

  function setCollection(collectionId: string): Promise<void>;

  function evaluateJEXL(expression: string, context: object): Promise<object>;

  function getClientContext(): Promise<object>;

  function updateRecipes(forceSync: boolean): Promise<void>;

  function forceEnroll(recipe: object, branchSlug: string): Promise<boolean>;

  function getExperimentStore(): Promise<object[]>;

  function unenroll(slug: string): Promise<void>;

  function deleteInactiveEnrollment(slug: string): Promise<void>;

  function generateTestIds(recipe: object, branchSlug: string): Promise<string>;
}
