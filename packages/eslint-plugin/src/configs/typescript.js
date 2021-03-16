module.exports = {
  extends: [
    "plugin:import/typescript",
    "plugin:@typescript-eslint/all"
  ],
  plugins: ["@simplysm"],
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts"]
    }
  },
  rules: {
    //-- simplysm
    "@simplysm/ts-no-throw-not-implement-error": "warn",
    "@simplysm/ts-no-self-entry-import": "error",

    //-- performance
    "@typescript-eslint/no-implied-eval": "off",

    //-- any
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-explicit-any": "off",

    //-- etc
    "@typescript-eslint/method-signature-style": "off",
    // "@typescript-eslint/indent": ["error", 2, { FunctionExpression: { parameters: "first" }, SwitchCase: 1 }],
    "@typescript-eslint/indent": "off", // 퍼포먼스 이슈
    "@typescript-eslint/prefer-readonly-parameter-types": "off",
    "@typescript-eslint/explicit-function-return-type": ["error", {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true,
      allowDirectConstAssertionInArrowFunctions: true,
      allowConciseArrowFunctionExpressionsStartingWithVoid: true
    }],
    "@typescript-eslint/return-await": "off", // 버그가 있어서 끔
    "@typescript-eslint/no-magic-numbers": "off",
    "@typescript-eslint/no-extraneous-class": ["error", {
      allowStaticOnly: true,
      allowEmpty: true
    }],
    "@typescript-eslint/brace-style": ["error", "stroustrup"],
    "@typescript-eslint/space-before-function-paren": ["error", {
      anonymous: "ignore",
      named: "never",
      asyncArrow: "always"
    }],
    "@typescript-eslint/unified-signatures": "off",
    "@typescript-eslint/no-implicit-any-catch": "off",
    "@typescript-eslint/unbound-method": "off",
    "@typescript-eslint/init-declarations": "off",
    "@typescript-eslint/dot-notation": "off",
    "@typescript-eslint/no-parameter-properties": "off",
    "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/consistent-type-imports": "off",
    "@typescript-eslint/explicit-module-boundary-types": ["error", { allowArgumentsExplicitlyTypedAsAny: true }],
    "@typescript-eslint/no-extra-parens": "off",
    "@typescript-eslint/no-inferrable-types": ["error", { ignoreParameters: true }],
    "@typescript-eslint/no-type-alias": ["error", {
      allowConstructors: "always",
      allowConditionalTypes: "always",
      allowAliases: "always",
      allowMappedTypes: "always",
      allowLiterals: "always",
      allowCallbacks: "always"
    }],
    "@typescript-eslint/member-ordering": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/strict-boolean-expressions": ["error", { allowNullableBoolean: true }],
    "@typescript-eslint/no-dynamic-delete": "off",
    "@typescript-eslint/no-this-alias": "off",
    "@typescript-eslint/no-unnecessary-condition": ["error", { allowConstantLoopConditions: true }],
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "default",
        format: ["camelCase", "UPPER_CASE"]
      },
      {
        selector: "default",
        modifiers: ["private"],
        format: ["camelCase", "UPPER_CASE"],
        leadingUnderscore: "require"
      },
      {
        selector: "typeLike",
        format: ["PascalCase", "UPPER_CASE"]
      },
      {
        selector: "memberLike",
        format: null
      }
    ],
    "@typescript-eslint/lines-between-class-members": "off",
    "@typescript-eslint/restrict-plus-operands": "off", // 버그가 있어서 끔
    "@typescript-eslint/no-invalid-void-type": "off",
    "@typescript-eslint/no-invalid-this": "off",
    "@typescript-eslint/no-loop-func": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { args: "none" }],
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/quotes": ["error", "double", {
      avoidEscape: true,
      allowTemplateLiterals: true
    }],
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-use-before-define": "off",
    // "@typescript-eslint/no-floating-promises": "off", // 퍼포먼스 이슈, 그래도 필요함..
    "@typescript-eslint/sort-type-union-intersection-members": "off",
    "@typescript-eslint/object-curly-spacing": ["error", "always"]
  }
};
