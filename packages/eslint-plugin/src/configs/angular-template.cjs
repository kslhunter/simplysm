module.exports = {
  parser: "@angular-eslint/template-parser",
  plugins: [
    "@angular-eslint/template",
    "@simplysm"
  ],
  rules: {
    "@simplysm/ng-template-no-todo-comments": "warn"
  }
};
