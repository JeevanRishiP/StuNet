/** @type {import("eslint").Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    // NOTE: project-level parserOptions.project is set per-app to enable
    // typed linting. Without it, rules like await-thenable are skipped.
  },
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  rules: {
    "react/no-danger": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
  },
  settings: {
    react: { version: "detect" },
  },
  ignorePatterns: ["node_modules/", "dist/", ".next/", "*.config.js", "*.config.ts"],
};
