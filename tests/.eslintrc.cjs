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
            project: "tsconfig.json"
          }
        }
      },
      rules: {
        "import/no-extraneous-dependencies": "off",
        "@simplysm/ts-no-throw-not-implement-error": "off"
      }
    }
  ]
};
