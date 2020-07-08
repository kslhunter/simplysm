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
      extends: [
        "plugin:@angular-eslint/all"
      ],

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

        // off
        "@angular-eslint/component-max-inline-declarations": "off",
        "@angular-eslint/no-forward-ref": "off",
        "@angular-eslint/no-input-rename": "off",
        "@angular-eslint/no-output-native": "off"
      }
    }
  ]
};