module.exports = {
  overrides: [
    {
      files: ["*.ts"],
      extends: [
        "../eslint-plugin/src/configs/typescript",
        "../eslint-plugin/src/configs/angular"
      ],
      plugins: ["@simplysm"],
      processor: "@simplysm/extract-angular-inline-html",
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: "tsconfig.json"
      },
      settings: {
        "import/resolver": {
          typescript: {
            project: require("path").join(__dirname, "tsconfig.json")
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
    },
    {
      files: ["*.html"],
      extends: ["../eslint-plugin/src/configs/angular-template"]
    }
  ]
};
