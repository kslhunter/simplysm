export const fc_project_eslintrc = (): string => /* language=cjs */ `

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
      extends: ["plugin:@simplysm/base"]
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
      extends: ["plugin:@simplysm/typescript"]
    }
  ]
};

`.trim();
