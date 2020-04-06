"use strict";

module.exports = {
  rules: {
    "no-self-entry-import": require("./rules/no-self-entry-import"),
    "no-throw-not-implement-error": require("./rules/no-throw-not-implement-error")
  }
};

//TODO: Angular 중 Injectable({providedIn: root}) 인경우 contructor 에 root 가 아닌 다른 Provider 넣을 수 없음.
