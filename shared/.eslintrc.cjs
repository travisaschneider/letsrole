module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["icons/out", "grammar.ts", "reference.ts"],
  rules: {
    "@typescript-eslint/ban-types": [
      "error",
      {
        types: {
          Function: false,
        },
        extendDefaults: true,
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/triple-slash-reference": "off",
    "no-prototype-builtins": "warn",
  },
  root: true,
};
