"use strict";

module.exports = {
  root: true,
  extends: ["plugin:@simplysm/base"],
  overrides: [
    {
      files: ["*.ts"],
      parserOptions: {
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
        createDefaultProgram: true
      }
    }
  ]
};
