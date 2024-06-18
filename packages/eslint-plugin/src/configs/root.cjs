module.exports = {
  ignorePatterns: [
    "**/node_modules/**",
    "**/.cache/**",
    "**/dist/**",
    "**/.*/**",
    "**/_*/**"
  ],
  env: {
    node: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module"
  },
  overrides: [
    {
      files: ["*.js", "*.cjs", "*.mjs"],
      plugins: ["import"],
      rules: {
        // import
        "import/no-extraneous-dependencies": ["error"], // 느림

        "no-console": ["warn"],
        "no-warning-comments": ["warn"],

        "require-await": ["error"],
        "semi": ["error"],
        "no-shadow": ["error"],
        "no-duplicate-imports": ["error"],
        "no-unused-expressions": ["error"],
        // "no-unused-vars": ["error"],
        "no-undef": ["error"],
        // "linebreak-style": ["error", "unix"]

        // "arrow-parens": ["error"]
      },
    },
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      // parserOptions: {
      //   project: [
      //     "./tsconfig.json",
      //     "./packages/*/tsconfig.json"
      //   ]
      // },
      plugins: [
        "@typescript-eslint",
        "import",
        "@simplysm",
        "@angular-eslint"
      ],
      processor: "@angular-eslint/template/extract-inline-html",
      settings: {
        "import/parsers": {
          "@typescript-eslint/parser": [".ts", ".tsx"]
        },
        // "import/resolver": {
        //   "typescript": {
        //     project: "packages/*/tsconfig.json"
        //   }
        // }
      },
      rules: {
        // 기본
        "no-console": ["warn"],
        "no-warning-comments": ["warn"],
        // "arrow-parens": ["error"],
        // "linebreak-style": ["error", "unix"],

        // import
        "import/no-extraneous-dependencies": ["error"], // 느림
        // "import/no-duplicates": ["error"], // 느림

        // 타입스크립트
        // "@typescript-eslint/explicit-member-accessibility": ["error"],
        "@typescript-eslint/require-await": ["error"],
        "@typescript-eslint/await-thenable": ["error"],
        "@typescript-eslint/return-await": ["error", "always"],
        "@typescript-eslint/no-floating-promises": ["error"],
        "@typescript-eslint/semi": ["error"],
        "@typescript-eslint/no-shadow": ["error"],
        // "@typescript-eslint/member-delimiter-style": ["error"],
        // "@typescript-eslint/no-unnecessary-condition": ["error", {allowConstantLoopConditions: true}],
        // "@typescript-eslint/no-unnecessary-type-assertion": ["error"],
        "@typescript-eslint/non-nullable-type-assertion-style": ["error"],
        "@typescript-eslint/prefer-reduce-type-parameter": ["error"],
        "@typescript-eslint/prefer-return-this-type": ["error"],
        // "@typescript-eslint/prefer-readonly": ["error"],
        "@typescript-eslint/typedef": ["error"],
        // "@typescript-eslint/explicit-function-return-type": ["error", {
        //   allowExpressions: true,
        //   allowTypedFunctionExpressions: true,
        //   allowHigherOrderFunctions: true,
        //   allowDirectConstAssertionInArrowFunctions: true,
        //   allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        //   allowFunctionsWithoutTypeParameters: true
        // }],
        // "@typescript-eslint/explicit-module-boundary-types": ["error", {
        //   allowArgumentsExplicitlyTypedAsAny: true,
        //   allowTypedFunctionExpressions: true,
        //   allowHigherOrderFunctions: true,
        //   allowDirectConstAssertionInArrowFunctions: true
        // }],
        "@typescript-eslint/no-unused-expressions": ["error"],
        // "@typescript-eslint/no-unused-vars": ["error", {args: "none"}],
        "@typescript-eslint/strict-boolean-expressions": ["error", {
          // allowString: true,
          // allowNumber: true,
          allowNullableBoolean: true,
          allowNullableObject: true
        }],
        "@typescript-eslint/prefer-ts-expect-error": ["error"],

        // 심플리즘
        "@simplysm/ts-no-throw-not-implement-error": ["warn"],
        "@simplysm/ts-no-self-entry-import": ["error"],
        "@simplysm/ts-no-external-import": ["error"]
      }
    },
    {
      files: ["*.html"],
      parser: "@angular-eslint/template-parser",
      plugins: [
        "@angular-eslint/template",
        "@simplysm"
      ],
      rules: {
        "@simplysm/ng-template-no-todo-comments": "warn",
        "@angular-eslint/template/use-track-by-function": "error"
      }
    }
  ]
};
