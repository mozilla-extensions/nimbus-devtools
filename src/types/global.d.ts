/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "mozjexl/lib/grammar" {
  export interface GrammarItem {
    type: string;
    precedence?: number;
    eval?: (
      left: boolean | number | string,
      right?: boolean | number | string,
    ) => boolean | number | string;
  }

  export interface Grammar {
    elements: {
      [key: string]: GrammarItem;
    };
  }

  export interface Token {
    type: string;
    name?: string;
    value: boolean | number | string;
    raw: string;
  }

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

  import { ASTNode } from "jexlParser";

  export default class Parser {
    constructor(grammar: Grammar);
    addTokens(tokens: Token[]): void;
    complete(): ASTNode;
  }
}

declare namespace browser.experiments.nimbus {
  function enrollInExperiment(jsonData: object): Promise<boolean>;

  function enrollWithFeatureConfig(
    featureId: string,
    featureValue: object,
    isRollout: boolean,
  ): Promise<boolean>;

  function getFeatureConfigs(): Promise<string[]>;

  function getCurrentCollection(): Promise<string>;

  function setCollection(collectionId: string): Promise<void>;

  function evaluateJEXL(expression: string, context: object): Promise<object>;

  function getClientContext(): Promise<object>;

  function updateRecipes(forceSync: boolean): Promise<void>;

  function forceEnroll(recipe: object, branchSlug: string): Promise<boolean>;
}
