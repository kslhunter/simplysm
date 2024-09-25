import globals from "globals";

export default [
  {
    ignores: ["**/node_modules/", "**/dist/", "**/.*/", "**/_*/"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      ecmaVersion: 2021,
      sourceType: "module",
    },
  },
  {
    files: ["**/*.js"],
    plugins: {
      // import: importPlugin,
    },
    rules: {
      // 기본
      "no-console": ["warn"],
      "no-warning-comments": ["warn"],

      "require-await": ["error"],
      // "semi": ["error"],
      "no-shadow": ["error"],
      "no-duplicate-imports": ["error"],
      "no-unused-expressions": ["error"],
      "no-unused-vars": ["error"],
      "no-undef": ["error"],

      // import
      // "import/no-extraneous-dependencies": ["error"], // 느림
    },
  },
];
