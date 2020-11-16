module.exports = {
  parser: "@angular-eslint/template-parser",
  plugins: [
    "@angular-eslint/template",
    "@simplysm"
  ],
  extends: ["plugin:@angular-eslint/template/all"],
  rules: {
    "@angular-eslint/template/cyclomatic-complexity": "off",
    "@angular-eslint/template/no-call-expression": "off",
    "@simplysm/ng-template-no-todo-comments": "warn"
  }
};