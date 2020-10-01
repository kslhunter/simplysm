"use strict";

module.exports = {
  configs: {
    "base": require("./configs/base"),
    "angular": require("./configs/angular")
  },
  rules: {
    "no-self-entry-import": require("./rules/no-self-entry-import"),
    "no-throw-not-implement-error": require("./rules/no-throw-not-implement-error"),
    "no-todo-comments": require("./rules/no-todo-comments"),
    "template-no-todo-comments": require("./rules/template-no-todo-comments")
  },
  processors: {
    "extract-angular-inline-html": require("./processors/extract-angular-inline-html")
  }
};

// TODO: Angular 중 Injectable({providedIn: root}) 인경우 contructor 에 root 가 아닌 다른 Provider 넣을 수 없음.
// TODO: HTML파일에서 TODO를 WARNING 걸수 있게
