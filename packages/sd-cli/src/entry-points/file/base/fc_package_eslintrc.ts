export const fc_package_eslintrc = (opt: { isForAngular: boolean }): string => /* language=cjs */ `

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
          "typescript": {
            project: require("path").resolve(__dirname, "tsconfig.json")
          }
        }
      },${opt.isForAngular ? `
      {
        files: ["*.ts"],
        extends: ["plugin:@simplysm/angular"]
      },
      {
        files: ["*.html"],
        extends: ["plugin:@simplysm/angular-template"]
      }` : ""}
    }
  ]
};

`.trim();
