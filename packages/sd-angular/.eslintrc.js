"use strict";

module.exports = {
  extends: ["plugin:@simplysm/angular"],
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
      rules: {
        "@angular-eslint/directive-selector": [
          "error",
          { type: "attribute", prefix: "sd", style: "camelCase" }
        ],
        "@angular-eslint/component-selector": [
          "error",
          { type: "element", prefix: "sd", style: "kebab-case" }
        ]
      }
    }
  ]
};