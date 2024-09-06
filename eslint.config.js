import simplysmRoot from "./packages/eslint-plugin/src/configs/root.js";

export default [
  {
    ignores: ["**/node_modules/", "**/dist/", "**/.*/", "**/_*/"],
  },
  ...simplysmRoot,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
