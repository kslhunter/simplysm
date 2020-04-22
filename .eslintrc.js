module.exports = {
  root: true,
  globals: {
    "NodeJS": "readonly"
  },
  env: {
    node: true,
    browser: true,
    es2017: true
  },
  extends: [
    "eslint:all",
    "plugin:import/errors",
    "plugin:import/warnings"
  ],
  rules: {
    // ---------------------------------
    // error
    // ---------------------------------
    "linebreak-style": ["error", "windows"],
    "lines-between-class-members": ["error", "always", {exceptAfterSingleLine: true}],
    "function-call-argument-newline": ["error", "consistent"],
    "function-paren-newline": ["error", "consistent"],
    "quote-props": ["error", "consistent"],
    "object-property-newline": ["error", {allowAllPropertiesOnSameLine: true}],
    "one-var": ["error", "never"],
    "operator-linebreak": ["error", "after"],
    "no-multi-spaces": ["error", {ignoreEOLComments: true}],
    "arrow-parens": ["error", "as-needed"],
    "no-mixed-operators": ["error", {allowSamePrecedence: true}],
    "dot-location": ["error", "property"],
    "no-constant-condition": ["error", {checkLoops: false}],
    "new-cap": ["error", {capIsNew: false, newIsCap: false}],
    "array-element-newline": ["error", "consistent"],
    "array-bracket-newline": ["error", "consistent"],
    "curly": ["error", "multi-line"],
    "indent": ["error", 2, {FunctionExpression: {parameters: "first"}, SwitchCase: 1}],
    // "eqeqeq": ["error", "always", {null: "never"}],
    "eqeqeq": "off",
    "space-before-function-paren": ["error", {
      anonymous: "always",
      named: "never",
      asyncArrow: "always"
    }],

    // ---------------------------------
    // warn
    // ---------------------------------
    "no-console": "warn",
    "no-warning-comments": "warn",

    // ---------------------------------
    // off
    // ---------------------------------
    "max-len": "off",
    "capitalized-comments": "off",
    "init-declarations": "off",
    "eol-last": "off",
    "max-statements": "off",
    "no-ternary": "off",
    "padded-blocks": "off",
    "no-negated-condition": "off",
    "prefer-template": "off",
    "sort-imports": "off",
    "require-unicode-regexp": "off",
    "prefer-named-capture-group": "off",
    "max-lines-per-function": "off",
    "complexity": "off",
    "prefer-destructuring": "off",
    "no-undefined": "off",
    "no-nested-ternary": "off",
    "multiline-ternary": "off",
    "newline-per-chained-call": "off",
    "sort-keys": "off",
    "max-params": "off",
    "line-comment-position": "off",
    "no-inline-comments": "off",
    "id-length": "off",
    "no-underscore-dangle": "off",
    "no-loop-func": "off",
    "no-await-in-loop": "off",
    "max-lines": "off",
    "func-names": "off",
    "no-else-return": "off",
    "spaced-comment": "off",
    "no-continue": "off",
    "consistent-this": "off",
    "no-invalid-this": "off",
    "class-methods-use-this": "off",
    "max-classes-per-file": "off",
    "no-sync": "off",
    "callback-return": "off",
    "no-control-regex": "off",
    "require-atomic-updates": "off",
    "no-process-env": "off",
    "no-process-exit": "off",
    "multiline-comment-style": "off",
    "lines-around-comment": "off",
    "no-trailing-spaces": "off",
    "no-lonely-if": "off",
    "max-depth": "off",
    "no-async-promise-executor": "off",
    "array-bracket-spacing": "off",
    "dot-notation": "off",
    "no-magic-numbers": "off",
    // "func-style": ["error", "expression"],
    "func-style": "off",
    // "no-eq-null": "off",
    "no-extend-native": "off",
    "no-bitwise": "off",
    "global-require": "off",
    "arrow-body-style": "off",
    "no-empty": "off",
    "no-plusplus": "off",
    "consistent-return": "off",
    "no-extra-boolean-cast": "off",
    "no-alert": "off"
  },
  overrides: [
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
        createDefaultProgram: true
      },
      plugins: [
        "@typescript-eslint",
        "@typescript-eslint/tslint",
        "@simplysm"
      ],
      extends: [
        "plugin:import/typescript",
        "plugin:@typescript-eslint/all"
      ],

      rules: {
        "@simplysm/no-self-entry-import": "error",
        "@simplysm/no-throw-not-implement-error": "warn",

        // ---------------------------------
        // error
        // ---------------------------------
        "@typescript-eslint/no-type-alias": ["error", {
          allowConstructors: "always",
          allowConditionalTypes: "always",
          allowAliases: "always",
          allowMappedTypes: "always",
          allowLiterals: "always",
          allowCallbacks: "always"
        }],
        "@typescript-eslint/space-before-function-paren": ["error", {
          anonymous: "always",
          named: "never",
          asyncArrow: "always"
        }],
        "@typescript-eslint/brace-style": ["error", "stroustrup"],
        "@typescript-eslint/no-extraneous-class": ["error", {allowStaticOnly: true, allowEmpty: true}],
        "@typescript-eslint/strict-boolean-expressions": ["error", {allowNullable: true, allowSafe: true}],
        "@typescript-eslint/quotes": ["error", "double", {avoidEscape: true, allowTemplateLiterals: true}],
        "@typescript-eslint/no-misused-promises": ["error", {checksVoidReturn: false}],
        "@typescript-eslint/no-inferrable-types": ["error", {ignoreParameters: true}],

        // ---------------------------------
        // warn
        // ---------------------------------
        "@typescript-eslint/require-await": "warn",
        // "@typescript-eslint/no-unused-vars": ["warn", {args: "after-used"}],
        "@typescript-eslint/no-unused-vars": ["warn", {args: "none"}],

        // ---------------------------------
        // off
        // ---------------------------------
        "import/no-unresolved": "off",
        "import/named": "off",
        "import/namespace": "off",
        "import/default": "off",
        "import/no-named-as-default-member": "off",

        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/unified-signatures": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-throw-literal": "off",
        "@typescript-eslint/no-magic-numbers": "off",
        "@typescript-eslint/no-extra-parens": "off",
        "@typescript-eslint/typedef": "off",
        "@typescript-eslint/member-ordering": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/unbound-method": "off",
        "@typescript-eslint/no-this-alias": "off",
        "@typescript-eslint/no-dynamic-delete": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/return-await": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unused-vars-experimental": "off",
        "@typescript-eslint/indent": "off",
        "@typescript-eslint/no-unnecessary-condition": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/prefer-readonly-parameter-types": "off",
        "@typescript-eslint/no-require-imports": "off",
        // "@typescript-eslint/no-parameter-properties": ["error", {allows: ["public readonly", "private readonly", "protected readonly"]}],
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-var-requires": "off",
        //"@typescript-eslint/restrict-template-expressions": ["error", {allowNumber: true}]
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/method-signature-style": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/init-declarations:": "off",

        "@typescript-eslint/explicit-function-return-type": "off",

        "@typescript-eslint/tslint/config": ["error", {"lintFile": "./tslint.json"}]
      }
    }
  ]
};