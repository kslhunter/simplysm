module.exports = {
  overrides: [
    {
      files: ["*.ts"],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: "tsconfig.json"
      },
      settings: {
        "import/resolver": {
          typescript: {
            directory: require("path").join(__dirname, "tsconfig.json")
          }
        }
      },
      plugins: ["@angular-eslint"],

      rules: {
        // error
        "@angular-eslint/component-class-suffix": ["error", {
          suffixes: [
            "Page",
            "Component",
            "Modal",
            "Control",
            "PrintTemplate",
            "Toast"
          ]
        }],
        "@angular-eslint/component-max-inline-declarations": "off",
        "@angular-eslint/component-selector": ["error", {type: "element", prefix: "sd", style: "kebab-case"}],
        "@angular-eslint/contextual-lifecycle": "error",
        "@angular-eslint/directive-selector": ["error", {type: "attribute", prefix: "sd", style: "camelCase"}],
        "@angular-eslint/no-conflicting-lifecycle": "error",
        "@angular-eslint/no-host-metadata-property": "error",
        "@angular-eslint/no-input-rename": "off",
        "@angular-eslint/no-inputs-metadata-property": "error",
        "@angular-eslint/no-lifecycle-call": "error",
        "@angular-eslint/no-output-on-prefix": "error",
        "@angular-eslint/no-output-rename": "error",
        "@angular-eslint/no-outputs-metadata-property": "error",
        "@angular-eslint/no-pipe-impure": "error",
        "@angular-eslint/no-queries-metadata-property": "error",
        "@angular-eslint/prefer-on-push-component-change-detection": "error",
        "@angular-eslint/prefer-output-readonly": "error",
        "@angular-eslint/use-component-selector": "error",
        "@angular-eslint/use-component-view-encapsulation": "error",
        "@angular-eslint/use-lifecycle-interface": "error",
        "@angular-eslint/use-pipe-decorator": "error",
        "@angular-eslint/use-pipe-transform-interface": "error",

        // off
        // "@angular-eslint/use-injectable-provided-in": "error",
        // "@angular-eslint/directive-class-suffix": ["error", {suffixes: ["Directive"]}],
        // "@angular-eslint/relative-url-prefix": "error",
        // "@angular-eslint/no-forward-ref": "error"
        // "@angular-eslint/no-output-native": "error",
      }
    }
  ]
};