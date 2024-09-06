import tsNoThrowNotImplementError from "./rules/ts-no-throw-not-implement-error.js";
import ngTemplateNoTodoComments from "./rules/ng-template-no-todo-comments.js";

export default {
  rules: {
    "ts-no-throw-not-implement-error": tsNoThrowNotImplementError,
    "ng-template-no-todo-comments": ngTemplateNoTodoComments,
  },
};
