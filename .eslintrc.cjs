module.exports = {
  root: true,
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.*/**"
  ],
  overrides: [
    {
      files: ["*.js", "*.cjs", "*.mjs"],
      extends: ["./packages/eslint-plugin/src/configs/base.cjs"]
    },
    {
      files: ["*.mjs"],
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
};
