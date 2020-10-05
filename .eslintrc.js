"use strict";

module.exports = {
  root: true,
  extends: [
    // "plugin:@simplysm/base"
    "./packages/eslint-plugin/src/configs/base.js"
  ],
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
