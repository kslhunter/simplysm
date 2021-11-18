module.exports = {
  overrides: [
    {
      files: ["*.ts"],
      extends: ["../eslint-plugin/src/configs/typescript"],
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
      }
    }
  ]
};
