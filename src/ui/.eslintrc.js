const path = require("node:path");

module.exports = {
  extends: [
    "../.eslintrc.js",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/typescript",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
  ],
  env: {
    es2023: true,
    browser: true,
    webextensions: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: path.resolve(__dirname, ".."),
    project: "tsconfig.json",
  },
  settings: {
    "import/resolver": {
      typescript: true,
    },
  },
};
