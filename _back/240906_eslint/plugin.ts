import { ESLint } from "eslint";

import root from "./configs/root";
import tsNoExternalImport from "./rules/ts-no-external-import";
import tsNoSelfEntryImport from "./rules/ts-no-self-entry-import";
import tsNoThrowNotImplementError from "./rules/ts-no-throw-not-implement-error";
import ngTemplateNoTodoComments from "./rules/ng-template-no-todo-comments";

const rule: ESLint.Plugin = {
  configs: {
    root,
  },
  rules: {
    "ts-no-external-import": tsNoExternalImport,
    "ts-no-self-entry-import": tsNoSelfEntryImport,
    "ts-no-throw-not-implement-error": tsNoThrowNotImplementError,
    "ng-template-no-todo-comments": ngTemplateNoTodoComments,
  },
};

export default rule;
