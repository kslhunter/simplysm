module.exports = {
  root: true,
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.*/**"
  ],
  overrides: [
    {
      files: ["*.js", "*.cjs"],
      extends: ["./packages/eslint-plugin/src/configs/base.cjs"]
    },
    {
      files: ["*.js"],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module"
      }
    },
    {
      files: ["*.ts"],
      extends: ["./packages/eslint-plugin/src/configs/typescript.cjs"]
    }
  ]
}
