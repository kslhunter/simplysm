import simplysmRoot from "./packages/eslint-plugin/src/configs/root.js";

export default [
  {
    ignores: ["**/node_modules/", "**/dist/", "**/.*/", "**/_*/"],
  },
  ...simplysmRoot,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
