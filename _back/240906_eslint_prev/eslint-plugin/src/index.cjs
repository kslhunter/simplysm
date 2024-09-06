module.exports = {
  configs: {
    "root": require("./configs/root.cjs")
  },
  rules: {
    "ts-no-external-import": require("./rules/ts-no-external-import.cjs"),
    "ts-no-self-entry-import": require("./rules/ts-no-self-entry-import.cjs"),
    "ts-no-throw-not-implement-error": require("./rules/ts-no-throw-not-implement-error.cjs"),
    "ng-template-no-todo-comments": require("./rules/ng-template-no-todo-comments.cjs")
  }
};
