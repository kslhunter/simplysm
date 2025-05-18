import globals from "globals";
import tseslint from "typescript-eslint";
import plugin from "../plugin.js";
import ngeslint from "angular-eslint";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: ["**/node_modules/", "**/dist/", "**/.*/", "**/_*/"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      // 기본
      "no-console": ["warn"],
      "no-warning-comments": ["warn"],
      "no-restricted-syntax": [
        "error",
        {
          selector: "PropertyDefinition[key.type='PrivateIdentifier']",
          message: "Do not use ECMAScript private fields (e.g. #myField); use TypeScript \"private\" instead.",
        },
        {
          selector: "MethodDefinition[key.type='PrivateIdentifier']",
          message: "Do not use ECMAScript private methods (e.g. #myMethod); use TypeScript \"private\" instead.",
        },
      ],
      "eqeqeq": ["error", "always", { "null": "ignore" }],

      "require-await": ["error"],
      // "semi": ["error"],
      "no-shadow": ["error"],
      "no-duplicate-imports": ["error"],
      "no-unused-expressions": ["error"],
      "no-unused-vars": ["error"],
      "no-undef": ["error"],

      // import
      "import/no-extraneous-dependencies": ["error"], // 느림
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "@simplysm": plugin,
      "@angular-eslint": ngeslint.tsPlugin,
      "import": importPlugin,
    },
    /*settings: {
      "import/resolver": {
        typescript: {
          project: [
            "./tsconfig.base.json",
          ],
        },
      },
    },*/
    processor: ngeslint.processInlineTemplates,
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
      "no-restricted-syntax": [
        "error",
        {
          selector: "PropertyDefinition[key.type='PrivateIdentifier']",
          message: "Do not use ECMAScript private fields (e.g. #myField); use TypeScript \"private\" instead.",
        },
        {
          selector: "MethodDefinition[key.type='PrivateIdentifier']",
          message: "Do not use ECMAScript private methods (e.g. #myMethod); use TypeScript \"private\" instead.",
        },
      ],
      "eqeqeq": ["error", "always", { "null": "ignore" }],

      // 타입스크립트
      "@typescript-eslint/require-await": ["error"],
      "@typescript-eslint/await-thenable": ["error"],
      "@typescript-eslint/return-await": ["error", "always"],
      "@typescript-eslint/no-floating-promises": ["error"],
      "@typescript-eslint/no-shadow": ["error"],
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        { allowConstantLoopConditions: true },
      ],
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
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        {
          "accessibility": "no-public",
        },
      ],
      /*"@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        {
          "ignoreIfStatements": true,
          // "ignoreConditionalTests": true,
          // "ignoreTernaryTests": true,
        },
      ],*/
      "@typescript-eslint/naming-convention": [
        "error",
        // (1) private 대문자 필드 → 예외 허용
        {
          "selector": "classProperty",
          "modifiers": ["private"],
          "format": ["UPPER_CASE"],
          "leadingUnderscore": "forbid",
          "filter": {
            "regex": "^[A-Z0-9_]+$",
            "match": true,
          },
        },

        // (2) private 필드
        {
          "selector": "classProperty",
          "modifiers": ["private"],
          "format": ["camelCase"],
          "leadingUnderscore": "require",
        },
        // private 메서드
        {
          "selector": "method",
          "modifiers": ["private"],
          "format": ["camelCase"],
          "leadingUnderscore": "require",
        },
        // (1) protected readonly 필드 → 예외 허용
        {
          "selector": "classProperty",
          "modifiers": ["protected", "readonly"],
          "format": null,
          "leadingUnderscore": "allow",  // 언더스코어도 허용
        },

        // (2) protected 필드
        {
          "selector": "classProperty",
          "modifiers": ["protected"],
          "format": ["camelCase"],
          "leadingUnderscore": "require",
        },
        // protected 메서드
        {
          "selector": "method",
          "modifiers": ["protected"],
          "format": ["camelCase"],
          "leadingUnderscore": "require",
        },
      ],

      //-- 심플리즘
      "@simplysm/ts-no-throw-not-implement-error": ["warn"],


      // -- 아래 적용 검토가 필요한것
      "import/no-extraneous-dependencies": [
        "error",
        {
          "devDependencies": [
            "**/*.spec.ts",
            "**/lib/**",
            "**/eslint.config.js",
            "**/simplysm.js",
            "**/vitest.config.js",
          ],
        },
      ],
      "@simplysm/ts-no-exported-types": [
        "error", {
          types: [
            {
              ban: "ArrayBuffer",
              safe: "Buffer",
              ignoreInGeneric: true,
            },
            ...[
              'Uint8Array', 'Uint8ClampedArray',
              'Int8Array', 'Uint16Array', 'Int16Array',
              'Uint32Array', 'Int32Array',
              'Float32Array', 'Float64Array',
              "BigInt64Array", "BigUint64Array",
            ].map(item => ({
              ban: item,
              safe: "Buffer",
            })),
          ],
        },
      ],
      "@simplysm/ts-no-buffer-in-typedarray-context": ["error"],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            // library에서만
            /*{
              name: '@angular/core',
              importNames: ['model'],
              message: '"model"은 사용할 수 없습니다. input/output/$model을 사용하세요.',
            },*/
            // sd-cli fix로 변환되는 항목임
            ...[
              "signal",
              "computed",
              "effect",
              "afterRenderEffect",
              "afterRenderComputed",
              "resource",
            ].map(item => ({
              name: '@angular/core',
              importNames: [item],
              message: `"${item}"은 사용할 수 없습니다. $${item}을 사용하세요.`,
            })),
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    languageOptions: {
      parser: ngeslint.templateParser,
    },
    plugins: {
      // "@angular-eslint/template": ngeslint.templatePlugin,
      "@simplysm": plugin,
    },
    rules: {
      "@simplysm/ng-template-no-todo-comments": "warn",
      // "@angular-eslint/template/use-track-by-function": "error",
    },
  },
];