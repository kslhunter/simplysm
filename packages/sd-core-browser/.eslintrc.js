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
      }
    }
  ]
};