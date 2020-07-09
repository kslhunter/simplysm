"use strict";

module.exports = {
  root: true,
  globals: {
    "NodeJS": "readonly"
  },
  env: {
    node: true,
    browser: true,
    es2017: true
  },
  extends: [
    "plugin:@simplysm/base"
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