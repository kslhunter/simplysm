module.exports = {
  env: {
    mocha: true
  },
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
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars-experimental": "off"
      }
    }
  ]
};