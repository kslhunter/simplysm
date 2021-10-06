module.exports = {
  configs: {
    "base": require("./configs/base"),
    "typescript": require("./configs/typescript"),
    "angular": require("./configs/angular"),
    "angular-template": require("./configs/angular-template")
  },
  rules: {
    "ts-no-self-entry-import": require("./rules/ts-no-self-entry-import"),
    "ts-no-throw-not-implement-error": require("./rules/ts-no-throw-not-implement-error"),
    "ng-template-no-todo-comments": require("./rules/ng-template-no-todo-comments")
  },
  processors: {
    "extract-angular-inline-html": require("./processors/extract-angular-inline-html")
  }
};
