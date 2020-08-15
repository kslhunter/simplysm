"use strict";

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
            project: require("path").join(__dirname, "tsconfig.json")
          }
        }
      }
    }
  ]
};