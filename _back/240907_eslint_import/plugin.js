import tsNoExternalImport from "./rules/ts-no-external-import.js";
import tsNoSelfEntryImport from "./rules/ts-no-self-entry-import.js";
import tsNoThrowNotImplementError from "./rules/ts-no-throw-not-implement-error.js";
import ngTemplateNoTodoComments from "./rules/ng-template-no-todo-comments.js";

export default {
  rules: {
    "ts-no-external-import": tsNoExternalImport,
    "ts-no-self-entry-import": tsNoSelfEntryImport,
    "ts-no-throw-not-implement-error": tsNoThrowNotImplementError,
    "ng-template-no-todo-comments": ngTemplateNoTodoComments,
  },
};
