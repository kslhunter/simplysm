module.exports = {
  extends: [
    "eslint:all",
    "plugin:import/recommended"
  ],
  rules: {
    //-- warn
    "no-console": "warn",
    "no-warning-comments": "warn",

    //-- performance
    "import/namespace": "off",
    "import/export": "off",

    //-- consistent
    "function-call-argument-newline": ["error", "consistent"],
    "function-paren-newline": ["error", "consistent"],
    "quote-props": ["error", "consistent"],
    "array-element-newline": ["error", "consistent"],
    "array-bracket-newline": ["error", "consistent"],
    "object-property-newline": ["error", { allowAllPropertiesOnSameLine: true }],

    //-- comment
    "capitalized-comments": "off",
    "no-inline-comments": "off",
    "line-comment-position": "off",
    "spaced-comment": "off",
    "multiline-comment-style": "off",
    "lines-around-comment": "off",

    //-- size
    "max-statements": "off",
    "max-len": "off",
    "max-lines-per-function": "off",
    "max-params": "off",
    "max-lines": "off",
    "max-classes-per-file": "off",
    "max-depth": "off",
    "id-length": "off",

    //-- func
    "func-style": "off",
    "func-names": "off",

    //-- ternary
    "no-ternary": "off",
    "multiline-ternary": "off",
    "no-nested-ternary": "off",

    //-- etc
    "linebreak-style": ["error", "windows"],
    "indent": ["error", 2, { FunctionExpression: { parameters: "first" }, SwitchCase: 1 }],
    "sort-keys": "off",
    "no-magic-numbers": "off",
    "object-curly-spacing": ["error", "always"],
    "padded-blocks": ["error", "never"],
    "no-trailing-spaces": "off",
    "eol-last": "off",
    "no-negated-condition": "off",
    "no-undefined": "off",
    "no-plusplus": "off",
    "one-var": ["error", "never"],
    "no-await-in-loop": "off",
    "sort-imports": "off",
    // "no-extra-boolean-cast": "off",
    "operator-linebreak": ["error", "before"],
    "no-underscore-dangle": "off",
    "dot-location": ["error", "property"],
    "class-methods-use-this": "off",
    "prefer-destructuring": "off",
    "prefer-template": "off",
    "require-unicode-regexp": "off",
    "newline-per-chained-call": "off",
    "complexity": "off",
    "no-eq-null": "off",
    "eqeqeq": ["error", "always", { null: "never" }],
    "no-else-return": "off",
    "prefer-named-capture-group": "off",
    "no-multi-spaces": ["error", { ignoreEOLComments: true }],
    "no-bitwise": "off",
    "curly": ["error", "multi-line"],
    "no-continue": "off",
    "consistent-this": "off",
    "no-constant-condition": ["error", { checkLoops: false }],
    "new-cap": ["error", { capIsNew: false, newIsCap: false }],
    "no-extend-native": "off",
    "no-control-regex": "off",
    "require-atomic-updates": "off",
    "space-before-function-paren": ["error", {
      anonymous: "ignore",
      named: "never",
      asyncArrow: "always"
    }],
    "no-empty": "off",
    "no-async-promise-executor": "off",
    "array-bracket-spacing": "off",
    "no-alert": "off",
    "no-lonely-if": "off",
    "brace-style": ["error", "stroustrup"],
    "accessor-pairs": "off",
    "arrow-body-style": "off",
    "no-extra-parens": "off"
  }
};
