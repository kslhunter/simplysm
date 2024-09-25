import tseslint from "typescript-eslint";
import plugin from "../plugin.js";
import javascript from "./javascript.js";

export default [
  ...javascript,
  ...tseslint.config({
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "@simplysm": plugin,
      // "import": importPlugin,
      // "deprecation": fixupPluginRules(deprecationPlugin),
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },
    rules: {
      // 기본
      "no-console": ["warn"],
      "no-warning-comments": ["warn"],

      // 타입스크립트
      "@typescript-eslint/require-await": ["error"],
      "@typescript-eslint/await-thenable": ["error"],
      "@typescript-eslint/return-await": ["error", "always"],
      "@typescript-eslint/no-floating-promises": ["error"],
      // "@typescript-eslint/semi": ["error"], // Deprecated (https://typescript-eslint.io/rules/semi/)
      "@typescript-eslint/no-shadow": ["error"],
      "@typescript-eslint/no-unnecessary-condition": ["error", { allowConstantLoopConditions: true }],
      "@typescript-eslint/no-unnecessary-type-assertion": ["error"],
      "@typescript-eslint/non-nullable-type-assertion-style": ["error"],
      "@typescript-eslint/prefer-reduce-type-parameter": ["error"],
      "@typescript-eslint/prefer-return-this-type": ["error"],
      "@typescript-eslint/typedef": ["error"],
      "@typescript-eslint/no-unused-expressions": ["error"],
      "@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowNullableBoolean: true,
          allowNullableObject: true,
        },
      ],
      "@typescript-eslint/prefer-ts-expect-error": ["error"],

      // import
      // "import/no-extraneous-dependencies": ["error"], // 느림

      // Deprecation
      // "deprecation/deprecation": ["warn"], // 느림

      // 심플리즘
      "@simplysm/ts-no-throw-not-implement-error": ["warn"],
    },
  }),
];
