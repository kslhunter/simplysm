import globals from "globals";
import tseslint from "typescript-eslint";
import ngeslint from "angular-eslint";
import plugin from "../plugin.js";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      ecmaVersion: 2021,
      sourceType: "module",
    },
  },
  {
    files: ["**/*.js"],
    rules: {
      "no-console": ["warn"],
      "no-warning-comments": ["warn"],

      "require-await": ["error"],
      "semi": ["error"],
      "no-shadow": ["error"],
      "no-duplicate-imports": ["error"],
      "no-unused-expressions": ["error"],
      "no-unused-vars": ["error"],
      "no-undef": ["error"],
    },
  },
  ...tseslint.config(
    {
      files: ["**/*.ts"],
      plugins: {
        "@typescript-eslint": tseslint.plugin,
        "@angular-eslint": ngeslint.tsPlugin,
        "@simplysm": plugin,
      },
      languageOptions: {
        parser: tseslint.parser,
      },
      processor: ngeslint.processInlineTemplates,
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
        // "@typescript-eslint/no-unnecessary-condition": ["error", {allowConstantLoopConditions: true}],
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

        // 심플리즘
        "@simplysm/ts-no-throw-not-implement-error": ["warn"],
      },
    },
    {
      files: ["**/*.html"],
      languageOptions: {
        parser: ngeslint.templateParser,
      },
      plugins: {
        "@angular-eslint/template": ngeslint.templatePlugin,
        "@simplysm": plugin,
      },
      rules: {
        "@simplysm/ng-template-no-todo-comments": "warn",
        "@angular-eslint/template/use-track-by-function": "error",
      },
    },
  ),
];
