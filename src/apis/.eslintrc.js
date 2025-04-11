module.exports = {
  extends: ["../.eslintrc.js", "plugin:mozilla/recommended"],
  plugins: ["mozilla"],
  globals: {
    ExtensionAPI: true,
    ExtensionUtils: true,
  },
  rules: {
    "no-unused-vars": ["error", { varsIgnorePattern: "nimbus" }],
  },
};
