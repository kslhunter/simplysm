import tseslint, { type FlatConfig } from "typescript-eslint";
import angular from "angular-eslint";
import globals from "globals";
import plugin from "./eslint-plugin";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import { ESLint } from "eslint";
import { fileURLToPath } from "url";

const commonRules: FlatConfig.Rules = {
  "no-warning-comments": "warn",
  "eqeqeq": ["error", "always", { null: "never" }],
  "no-self-compare": "error",
  "array-callback-return": "error",
};

const noNodeBuiltinsRules: FlatConfig.Rules = {
  "no-restricted-globals": [
    "error",
    {
      name: "Buffer",
      message:
        "Uint8Array를 사용하세요. 복잡한 연산에는 @simplysm/core-common의 BytesUtils를 사용하세요.",
    },
  ],
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "buffer",
          message:
            "Uint8Array를 사용하세요. 복잡한 연산에는 @simplysm/core-common의 BytesUtils를 사용하세요.",
        },
        {
          name: "events",
          message: "@simplysm/core-common의 EventEmitter를 사용하세요.",
        },
        {
          name: "eventemitter3",
          message: "@simplysm/core-common의 EventEmitter를 사용하세요.",
        },
      ],
    },
  ],
};

const noDirectEnvAccessRules: FlatConfig.Rules = {
  "no-restricted-properties": [
    "error",
    {
      object: "process",
      property: "env",
      message: 'process.env를 직접 사용할 수 없습니다. env("...")를 사용하세요.',
    },
  ],
  "no-restricted-syntax": [
    "error",
    {
      selector: 'MemberExpression[object.type="MetaProperty"][property.name="env"]',
      message: 'import.meta.env를 직접 사용할 수 없습니다. env("...")를 사용하세요.',
    },
    {
      selector: 'CallExpression[callee.name="env"][arguments.0.value="NODE_ENV"]',
      message: "NODE_ENV 환경변수는 사용할 수 없습니다.",
    },
    {
      selector: 'BinaryExpression[operator="==="][right.type="Identifier"][right.name="undefined"]',
      message: "`== null`를 사용하지 마세요. `== null`을 사용하세요.",
    },
    {
      selector: 'BinaryExpression[operator="==="][left.type="Identifier"][left.name="undefined"]',
      message: "`== null`를 사용하지 마세요. `== null`을 사용하세요.",
    },
    {
      selector: 'BinaryExpression[operator="!=="][right.type="Identifier"][right.name="undefined"]',
      message: "`!= null`를 사용하지 마세요. `!= null`을 사용하세요.",
    },
    {
      selector: 'BinaryExpression[operator="!=="][left.type="Identifier"][left.name="undefined"]',
      message: "`!= null`를 사용하지 마세요. `!= null`을 사용하세요.",
    },
  ],
};

const unusedImportsRules: FlatConfig.Rules = {
  "unused-imports/no-unused-imports": "error",
  "unused-imports/no-unused-vars": [
    "error",
    {
      vars: "all",
      varsIgnorePattern: "^_",
      args: "after-used",
      argsIgnorePattern: "^_",
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      // directory/** 형태의 순회 자체를 건너뜀
      "**/node_modules/**",
      "**/dist/**",
      "**/.*/**",
      "**/_*/**",
    ],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      globals: globals.node,
    },
    plugins: {
      "import": importPlugin,
      "@simplysm": plugin as unknown as ESLint.Plugin,
      "unused-imports": unusedImportsPlugin,
    },
    rules: {
      ...commonRules,

      "require-await": "error",
      "no-shadow": "error",
      "no-duplicate-imports": "error",
      "no-unused-expressions": "error",
      "no-undef": "error",

      ...unusedImportsRules,

      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/lib/**",
            "**/eslint.config.{js,cjs,mjs}",
            "**/simplysm.{js,cjs,mjs}",
            "**/vitest.config.{js,cjs,mjs}",
          ],
        },
      ],

      // JS/TS 공통 규칙
      "@simplysm/no-subpath-imports-from-simplysm": "error",
      "@simplysm/no-hard-private": "error",

      ...noNodeBuiltinsRules,
      ...noDirectEnvAccessRules,
    },
  },
  ...angular.configs.tsRecommended,
  {
    files: ["**/*.ts"],
    processor: angular.processInlineTemplates,
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "@simplysm": plugin as unknown as ESLint.Plugin,
      "import": importPlugin,
      "unused-imports": unusedImportsPlugin,
    },
    settings: {
      "import/resolver": {
        [fileURLToPath(import.meta.resolve("eslint-import-resolver-typescript"))]: {
          alwaysTryTypes: true,
        },
      },
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },
    rules: {
      ...commonRules,
      "no-console": "error",

      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/return-await": ["error", "in-try-catch"],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        { allowConstantLoopConditions: true },
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      // "@typescript-eslint/non-nullable-type-assertion-style": "error",
      "@typescript-eslint/prefer-reduce-type-parameter": "error",
      "@typescript-eslint/prefer-return-this-type": "error",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowNullableBoolean: true,
          allowNullableObject: true,
        },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "minimumDescriptionLength": 3,
        },
      ],
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "memberLike",
          modifiers: ["private"],
          format: null,
          leadingUnderscore: "require",
        },
      ],

      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { arguments: false, inheritedMethods: false } },
      ],
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/no-array-delete": "error",

      "@simplysm/ng-no-async-effect": "error",
      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
      "@simplysm/ts-no-throw-not-implemented-error": "warn",
      "@simplysm/ts-no-unused-injects": "error",
      "@simplysm/ts-no-unused-protected-readonly": "error",
      "@angular-eslint/no-output-native": "off",

      ...unusedImportsRules,
      ...noNodeBuiltinsRules,
      ...noDirectEnvAccessRules,

      "import/no-extraneous-dependencies": "error",
    },
  },
  {
    files: ["**/*.html"],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    plugins: {
      "@simplysm": plugin as unknown as ESLint.Plugin,
    },
    rules: {
      "@simplysm/ng-template-no-strict-null-check": "error",
      "@simplysm/ng-template-no-todo-comments": "warn",
      "@simplysm/ng-template-sd-require-binding-attrs": "error",
      "@angular-eslint/template/eqeqeq": ["error", { allowNullOrUndefined: true }],
      "@angular-eslint/template/label-has-associated-control": "off",
    },
  },
  {
    files: ["**/tests/**/*.ts"],
    rules: {
      "no-console": "off",
      "import/no-extraneous-dependencies": "off",
      "@simplysm/ts-no-throw-not-implemented-error": "off",
    },
  },
  {
    files: ["**/vitest.config.ts"],
    rules: {
      "no-restricted-properties": "off",
    },
  },
);
