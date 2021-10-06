module.exports = {
  root: true,
  env: {
    node: true,
    es2017: true,
    browser: true
  },
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist*/**",
    "**/.*/**"
  ],
  overrides: [
    {
      files: ["*.js", "*.ts"],
      extends: ["./packages/eslint-plugin/src/configs/base"]
    }
  ]
};
