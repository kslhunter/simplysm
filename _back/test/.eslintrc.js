module.exports = {
  overrides: [
    {
      files: ["*.ts"],
      extends: ["../packages/eslint-plugin/src/configs/typescript"],
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
    }
  ],
  rules: {
    "no-console": "off"
  }
};
