module.exports = {
  plugins: ["@angular-eslint"],
  extends: ["plugin:@angular-eslint/all"],
  rules: {
    "@angular-eslint/component-class-suffix": ["error", {
      suffixes: ["Page", "Component", "Modal", "Control", "PrintTemplate", "Toast"]
    }],
    "@angular-eslint/directive-selector": [
      "error",
      {
        type: "attribute",
        prefix: "app",
        style: "camelCase"
      }
    ],
    "@angular-eslint/component-selector": [
      "error",
      {
        type: "element",
        prefix: "app",
        style: "kebab-case"
      }
    ],
    "@angular-eslint/no-output-native": "off",
    "@angular-eslint/no-input-rename": "off",
    "@angular-eslint/component-max-inline-declarations": "off",
    "@angular-eslint/no-forward-ref": "off",
    "@angular-eslint/no-output-rename": "off",
    "@angular-eslint/contextual-decorator": "off",
    "@angular-eslint/sort-ngmodule-metadata-arrays": "off",
    "@angular-eslint/no-empty-lifecycle-method": "warn"
  }
};
