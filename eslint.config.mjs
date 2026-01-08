import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import mozilla from "eslint-plugin-mozilla";
import importPlugin from "eslint-plugin-import";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import ts from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**/*", "**/eslint.config.mjs"]),
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  {
    name: "nimbus-devtools/rules",
    rules: {
      curly: ["error", "all"],
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          groups: [
            "builtin",
            "external",
            ["index", "sibling", "parent", "internal"],
            "object",
            "type",
          ],
          pathGroups: [
            {
              pattern: "src/**",
              group: "internal",
            },
          ],
        },
      ],
    },
  },
  {
    name: "nimbus-devtools/node",
    files: ["./bin/**.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".cjs", ".mjs"],
        },
      },
    },
  },
  {
    name: "nimbus-devtools/webext/background",
    files: ["./src/background.js"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
  },
  {
    name: "nimbus-devtools/webext/api",
    files: ["./src/apis/**.js"],
    extends: [
      mozilla.configs["flat/recommended"],
      // The mozilla/recommended/system-modules configuration only applies to
      // sys.mjs files in mozilla-firefox/firefox, but it provides
      // languageOptions and rules that we care about for privileged web
      // extensions.
      (function () {
        const systemModules = mozilla.configs["flat/recommended"].find(
          (rule) => rule.name === "mozilla/recommended/system-modules",
        );
        return {
          rules: systemModules.rules,
          languageOptions: systemModules.languageOptions,
        };
      })(),
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ExtensionAPI: true,
        ExtensionUtils: true,
      },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "nimbus" }],
    },
  },
  {
    name: "nimbus-devtools/webext/ui",
    files: ["./src/types/**/*.d.ts", "./src/ui/**.*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        projectService: true,
      },
      globals: {
        ...globals.browser,
      },
    },
    extends: [
      ts.configs.recommendedTypeChecked,
      // ts.configs.stylisticTypeChecked,
      importPlugin.flatConfigs.typescript,
      react.configs.flat.recommended,
      react.configs.flat["jsx-runtime"],
      reactHooks.configs.flat.recommended,
    ],
    settings: {
      "import/resolver": {
        typescript: true,
      },
      react: {
        version: "18.3.27",
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
  },
  eslintConfigPrettier,
]);
