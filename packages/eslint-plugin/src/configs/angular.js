import tseslint from "typescript-eslint";
import ngeslint from "angular-eslint";
import plugin from "../plugin.js";
import typescript from "./typescript.js";

export default [
  ...typescript,
  ...tseslint.config(
    {
      files: ["**/*.ts"],
      plugins: {
        "@angular-eslint": ngeslint.tsPlugin,
      },
      processor: ngeslint.processInlineTemplates,
    },
    {
      files: ["**/*.html"],
      languageOptions: {
        parser: ngeslint.templateParser,
      },
      plugins: {
        // "@angular-eslint/template": ngeslint.templatePlugin,
        "@simplysm": plugin,
      },
      rules: {
        "@simplysm/ng-template-no-todo-comments": "warn",
        // "@angular-eslint/template/use-track-by-function": "error",
      },
    },
  ),
];
