module.exports = {
  root: true,
  extends: ["eslint:recommended", "plugin:import/recommended", "prettier"],
  plugins: ["import"],
  parserOptions: {
    ecmaVersion: 2023,
  },
  rules: {
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
  ignorePatterns: [
    "dist/**/*",
    ".eslintrc.js",
    "tailwind.config.js",
    "web-ext-config.js",
  ],
};
