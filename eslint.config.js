import js from "@eslint/js";
// @ts-check
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint"; // requires typescript and typescript-eslint per-project (npm install --save-dev typescript typescript-eslint)

// Common globals for all configurations
const commonGlobals = {
  window: "readonly",
  document: "readonly",
  console: "readonly",
  alert: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  fetch: "readonly",
  Promise: "readonly",
  setTimeout: "readonly",
  setInterval: "readonly",
  clearTimeout: "readonly",
  clearInterval: "readonly",
  IntersectionObserver: "readonly",
  FileReader: "readonly",
  $: "readonly",
  jQuery: "readonly",
};

// Common rules shared across all configurations
const commonRules = {
  "no-var": "error", // disallow var, require let/const
  "prefer-const": "error", // require const for variables never reassigned
  "no-undef": "error", // disallow undeclared variables
  eqeqeq: "error", // require === and !==
  semi: ["error", "always"], // require semicolons
  quotes: ["error", "double", { avoidEscape: true }], // require double quotes
  "brace-style": ["error", "1tbs"], // enforce one true brace style
  "no-eval": "error", // disallow eval()
  "no-implied-eval": "error", // disallow implied eval
  "no-with": "error", // disallow with statements
  "no-debugger": "error", // disallow debugger statements
  "no-loop-func": "error", // disallow function declarations in loops
  "no-return-assign": "error", // disallow assignment in return statements
  "no-useless-concat": "error", // disallow unnecessary string concatenation
  "no-duplicate-imports": "error", // disallow duplicate imports
  "no-throw-literal": "error", // require throwing Error objects
  "no-new-wrappers": "error", // disallow new String/Number/Boolean
  "prefer-template": "error", // prefer template literals over concatenation
  "prefer-arrow-callback": "error", // prefer arrow functions as callbacks
  strict: ["error", "global"], // require "use strict" directive
};

// Base configuration for JavaScript/TypeScript files
const baseConfig = {
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: "module",
    globals: commonGlobals,
  },
  rules: commonRules,
};

// TypeScript-specific configuration
const tsConfig = {
  ...baseConfig,
  extends: [
    tseslint.configs.recommended, // enables strict type-checking rules
    tseslint.configs.stylistic, // enables stylistic type-aware rules
  ],
  languageOptions: {
    ...baseConfig.languageOptions,
    parserOptions: {
      project: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    ...baseConfig.rules,
    "no-unused-expressions": "off", // turn off base rule (conflicts with TS version)
    "@typescript-eslint/no-unused-expressions": "error", // TS version of no-unused-expressions
    "@typescript-eslint/no-inferrable-types": "off", // allow explicit types even when inferrable
    "@typescript-eslint/no-confusing-void-expression": "off", // allow returning void expressions
    "@typescript-eslint/restrict-template-expressions": "off", // allow non-string types in template literals
    "@typescript-eslint/no-explicit-any": "error", // disallow any type
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ], // disallow unused variables
    "@typescript-eslint/explicit-function-return-type": "error", // require explicit return types
    "@typescript-eslint/no-non-null-assertion": "off", // disallow non-null assertions
    "@typescript-eslint/consistent-type-imports": "error", // require type imports to use type keyword
    "@typescript-eslint/no-floating-promises": "error", // require promises to be handled
    "@typescript-eslint/no-misused-promises": "off", // disallow promises in places expecting void
    "@typescript-eslint/await-thenable": "error", // disallow awaiting non-thenable values
  },
};

export default defineConfig([
  // Global ignores
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  },

  // Base ESLint recommended rules
  js.configs.recommended,

  // JavaScript files
  {
    ...baseConfig,
    files: ["**/*.js"],
    rules: {
      ...baseConfig.rules,
      "no-unused-expressions": "warn", // disallow unused expressions
      "no-unused-vars": "warn", // disallow unused variables
    },
  },
  // TypeScript files
  {
    ...tsConfig,
    files: ["**/*.ts"],
  },
]);
