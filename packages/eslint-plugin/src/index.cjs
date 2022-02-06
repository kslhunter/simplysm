module.exports = {
  configs: {
    "base": require("./configs/base.cjs"),
    "typescript": require("./configs/typescript.cjs"),
    "angular": require("./configs/angular.cjs"),
    "angular-template": require("./configs/angular-template.cjs")
  },
  rules: {
    "ts-no-self-entry-import": require("./rules/ts-no-self-entry-import.cjs"),
    "ts-no-throw-not-implement-error": require("./rules/ts-no-throw-not-implement-error.cjs"),
    "ng-template-no-todo-comments": require("./rules/ng-template-no-todo-comments.cjs")
  }
};
