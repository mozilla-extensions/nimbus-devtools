module.exports = {
  extends: ["../.eslintrc.js", "plugin:mozilla/recommended"],
  plugins: ["mozilla"],
  globals: {
    ExtensionAPI: true,
    ExtensionError: true,
  },
};
