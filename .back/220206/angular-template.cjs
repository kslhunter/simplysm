module.exports = {
  parser: "@angular-eslint/template-parser",
  plugins: [
    "@simplysm",
    "@angular-eslint/template"
  ],
  extends: ["plugin:@angular-eslint/template/all"],
  rules: {
    "@simplysm/ng-template-no-todo-comments": "warn",

    "@angular-eslint/template/cyclomatic-complexity": "off",
    "@angular-eslint/template/no-call-expression": "off",
    "@angular-eslint/template/i18n": "off",
    "@angular-eslint/template/no-any": "off",
    "@angular-eslint/template/click-events-have-key-events": "off",
    "@angular-eslint/template/accessibility-alt-text": "off",
    "@angular-eslint/template/accessibility-label-for": "off",
    "@angular-eslint/template/conditional-complexity": "off",
    "@angular-eslint/template/accessibility-label-has-associated-control": "off"
  }
};
