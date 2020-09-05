"use strict";

const path = require("path");

module.exports = {
  globals: {
    NodeJS: "readonly"
  },
  env: {
    node: true,
    browser: true,
    es2017: true
  },
  ignorePatterns: [
    ".idea/",
    "_back/",
    "logs/",
    "node_modules/",
    "dist/",
    "dist-browser/",
    "_modules/",
    "_routes.ts"
  ],
  overrides: [
    {
      files: ["*.js", "*.ts"],
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
        "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
        "function-call-argument-newline": ["error", "consistent"],
        "function-paren-newline": ["error", "consistent"],
        "quote-props": ["error", "consistent"],
        "object-property-newline": ["error", { allowAllPropertiesOnSameLine: true }],
        "one-var": ["error", "never"],
        "operator-linebreak": ["error", "after"],
        "no-multi-spaces": ["error", { ignoreEOLComments: true }],
        "arrow-parens": ["error", "as-needed"],
        "no-mixed-operators": ["error", { allowSamePrecedence: true }],
        "dot-location": ["error", "property"],
        "no-constant-condition": ["error", { checkLoops: false }],
        "new-cap": ["error", { capIsNew: false, newIsCap: false }],
        "array-element-newline": ["error", "consistent"],
        "array-bracket-newline": ["error", "consistent"],
        "curly": ["error", "multi-line"],
        "indent": ["error", 2, { FunctionExpression: { parameters: "first" }, SwitchCase: 1 }],
        "eqeqeq": ["error", "always", { null: "never" }],
        // "eqeqeq": "off",
        "space-before-function-paren": ["error", {
          anonymous: "ignore",
          named: "never",
          asyncArrow: "always"
        }],
        "padded-blocks": ["error", "never"],
        "no-irregular-whitespace": ["error", { skipRegExps: true }],
        "brace-style": ["error", "stroustrup"],
        "object-curly-spacing": ["error", "always"],

        // ---------------------------------
        // warn
        // ---------------------------------
        "no-console": "warn",
        "no-warning-comments": "off",
        "object-shorthand": "warn",

        // ---------------------------------
        // off
        // ---------------------------------
        "capitalized-comments": "off",
        "no-inline-comments": "off",
        "line-comment-position": "off",
        "spaced-comment": "off",
        "multiline-comment-style": "off",
        "lines-around-comment": "off",

        "max-statements": "off",
        "max-len": "off",
        "max-lines-per-function": "off",
        "max-params": "off",
        "max-lines": "off",
        "max-classes-per-file": "off",
        "max-depth": "off",

        "id-length": "off",

        "no-ternary": "off",
        "multiline-ternary": "off",
        "no-nested-ternary": "off",

        "eol-last": "off",
        "init-declarations": "off",
        "no-negated-condition": "off",
        "no-underscore-dangle": "off",
        "no-undefined": "off",
        "sort-keys": "off",
        "sort-imports": "off",
        "no-eq-null": "off",
        "no-empty": "off",
        "prefer-destructuring": "off",
        "prefer-template": "off",
        "class-methods-use-this": "off",
        "no-else-return": "off",
        "no-trailing-spaces": "off",
        "no-async-promise-executor": "off",
        "require-unicode-regexp": "off",
        "array-bracket-spacing": "off",
        "no-plusplus": "off",
        "no-lonely-if": "off",
        "no-bitwise": "off",
        "no-continue": "off",
        "no-loop-func": "off",
        "no-await-in-loop": "off",
        "no-process-env": "off",
        "no-process-exit": "off",
        "no-extend-native": "off",
        "prefer-named-capture-group": "off",
        "complexity": "off",
        "no-magic-numbers": "off",
        "arrow-body-style": "off",
        "accessor-pairs": "off",
        "require-atomic-updates": "off",
        "func-style": "off",
        "func-names": "off",
        "no-control-regex": "off",
        "consistent-this": "off",
        "no-extra-boolean-cast": "off",
        "consistent-return": "off",
        "newline-per-chained-call": "off",
        "no-alert": "off",
        "no-extra-parens": "off",
        "no-case-declarations": "off"
      }
    },
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      plugins: [
        "@typescript-eslint",
        "@typescript-eslint/tslint",
        "@simplysm"
      ],
      extends: [
        "plugin:import/typescript",
        "plugin:@typescript-eslint/all"
      ],
      settings: {
        "import/parsers": {
          "@typescript-eslint/parser": [".ts", ".tsx"]
        }
      },
      rules: {
        "@simplysm/no-self-entry-import": "error",
        "@simplysm/no-throw-not-implement-error": "warn",
        "no-warning-comments": "off",
        "@simplysm/no-todo-comments": "warn",

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
          anonymous: "ignore",
          named: "never",
          asyncArrow: "always"
        }],
        "@typescript-eslint/brace-style": ["error", "stroustrup"],
        "@typescript-eslint/no-extraneous-class": ["error", { allowStaticOnly: true, allowEmpty: true }],
        "@typescript-eslint/strict-boolean-expressions": ["error", { allowNullableBoolean: true }],
        "@typescript-eslint/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
        "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
        "@typescript-eslint/no-inferrable-types": ["error", { ignoreParameters: true }],
        "@typescript-eslint/typedef": ["error", { arrowParameter: false, memberVariableDeclaration: false }],
        // "@typescript-eslint/explicit-module-boundary-types": ["error", {allowArgumentsExplicitlyTypedAsAny: true}],
        "@typescript-eslint/explicit-module-boundary-types": "off", // Maximum call stack size exceeded 때문에 끔
        "@typescript-eslint/naming-convention": [
          "error",
          {
            selector: "default",
            format: ["camelCase"]
          },
          {
            selector: "default",
            modifiers: ["private"],
            format: ["camelCase"],
            leadingUnderscore: "require"
          },
          {
            selector: "typeLike",
            format: ["PascalCase"]
          },
          {
            selector: "property",
            format: ["camelCase", "UPPER_CASE", "PascalCase"],
            leadingUnderscore: "allow"
          },
          {
            selector: "property",
            filter: { regex: "^\\[(.*)\\]$", match: true },
            format: null
          },
          {
            selector: "property",
            filter: { regex: "^_{2}(.*)(_{2})?$", match: true },
            format: null
          },
          {
            selector: "property",
            filter: { regex: "\\.", match: true },
            format: null
          },
          {
            selector: "function",
            format: ["camelCase", "PascalCase"]
          },
          {
            selector: "variable",
            format: ["camelCase", "PascalCase"]
          },
          {
            selector: "variable",
            types: ["function"],
            format: ["camelCase", "PascalCase"]
          }
        ],
        "@typescript-eslint/tslint/config": ["error", { lintFile: path.resolve(__dirname, "tslint/default.json") }],

        // ---------------------------------
        // warn
        // ---------------------------------
        "@typescript-eslint/no-unused-vars": ["warn", { args: "none" }],
        "@typescript-eslint/require-await": "warn",

        // ---------------------------------
        // off
        // ---------------------------------
        "import/named": "off",
        "import/namespace": "off",
        "import/default": "off",
        "import/no-named-as-default-member": "off",

        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/indent": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/unified-signatures": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-throw-literal": "off",
        "@typescript-eslint/no-magic-numbers": "off",
        "@typescript-eslint/no-extra-parens": "off",
        "@typescript-eslint/member-ordering": "off",
        "@typescript-eslint/unbound-method": "off",
        "@typescript-eslint/no-this-alias": "off",
        "@typescript-eslint/no-dynamic-delete": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/return-await": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unused-vars-experimental": "off",
        "@typescript-eslint/no-unnecessary-condition": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/prefer-readonly-parameter-types": "off",
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/method-signature-style": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/init-declarations": "off",
        "@typescript-eslint/prefer-ts-expect-error": "off",
        "@typescript-eslint/dot-notation": "off",
        "@typescript-eslint/no-invalid-void-type": "off",
        "@typescript-eslint/lines-between-class-members": "off",
        "@typescript-eslint/no-invalid-this": "off",
        "@typescript-eslint/explicit-function-return-type": "off",

        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-implicit-any-catch": "off",
        "@typescript-eslint/consistent-type-imports": "off"
      }
    }
  ]
};