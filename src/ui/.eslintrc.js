const path = require("node:path");

module.exports = {
  extends: [
    "../.eslintrc.js",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/typescript",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended-legacy",
  ],
  env: {
    es2023: true,
    browser: true,
    webextensions: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: path.resolve(__dirname, "..", ".."),
    project: "tsconfig.json",
  },
  settings: {
    "import/resolver": {
      typescript: true,
    },
    react: {
      version: "18.3.1",
    },
  },
  rules: {
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: false,
      },
    ],
    "@typescript-eslint/no-explicit-any": [
      "error",
      {
        ignoreRestArgs: true,
      },
    ],
    "react-hooks/exhaustive-deps": "error",
  },
};
