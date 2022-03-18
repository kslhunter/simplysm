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
          "typescript": {
            project: "tsconfig.json"
          }
        }
      },
      rules: {
        "@simplysm/ts-no-throw-not-implement-error": "off"
      }
    },
    {
      files: ["*.ts"],
      extends: ["../eslint-plugin/src/configs/angular.cjs"]
    },
    {
      files: ["*.html"],
      extends: ["../eslint-plugin/src/configs/angular-template.cjs"]
    }
  ]
};
