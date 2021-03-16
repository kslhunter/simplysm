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
        project: "tsconfig.json",
        createDefaultProgram: true
      },
      settings: {
        "import/resolver": {
          typescript: {
            project: require("path").join(__dirname, "tsconfig.json")
          }
        }
      }
    },
    {
      files: ["*.html"],
      extends: ["../eslint-plugin/src/configs/angular-template"]
    }
  ]
};
