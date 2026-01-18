declare const _default: {
    rules: {
        "ts-no-throw-not-implement-error": import("@typescript-eslint/utils/ts-eslint").RuleModule<"noThrowNotImplementError", [], unknown, import("@typescript-eslint/utils/ts-eslint").RuleListener> & {
            name: string;
        };
        "ts-no-exported-types": import("@typescript-eslint/utils/ts-eslint").RuleModule<"noExportedTypes", [{
            types: import("./rules/ts-no-exported-types").TypeConfig[];
        }], unknown, import("@typescript-eslint/utils/ts-eslint").RuleListener> & {
            name: string;
        };
        "ts-no-buffer-in-typedarray-context": import("@typescript-eslint/utils/ts-eslint").RuleModule<"directBuffer", [], unknown, import("@typescript-eslint/utils/ts-eslint").RuleListener> & {
            name: string;
        };
        "ng-template-no-todo-comments": import("@typescript-eslint/utils/ts-eslint").RuleModule<"noTodo", [], unknown, import("@typescript-eslint/utils/ts-eslint").RuleListener> & {
            name: string;
        };
        "no-subpath-imports-from-simplysm": import("@typescript-eslint/utils/ts-eslint").RuleModule<"noSubpathImport", [], unknown, import("@typescript-eslint/utils/ts-eslint").RuleListener> & {
            name: string;
        };
        "ng-template-sd-require-binding-attrs": import("@typescript-eslint/utils/ts-eslint").RuleModule<"requireBindingForAttribute", [import("./rules/ng-template-sd-require-binding-attrs").RuleOptions], unknown, import("@typescript-eslint/utils/ts-eslint").RuleListener> & {
            name: string;
        };
        "no-hard-private": import("@typescript-eslint/utils/ts-eslint").RuleModule<"preferSoftPrivate", [], unknown, import("@typescript-eslint/utils/ts-eslint").RuleListener> & {
            name: string;
        };
        "ts-no-unused-injects": import("@typescript-eslint/utils/ts-eslint").RuleModule<"unusedInject", [], unknown, import("@typescript-eslint/utils/ts-eslint").RuleListener> & {
            name: string;
        };
        "ts-no-unused-protected-readonly": import("@typescript-eslint/utils/ts-eslint").RuleModule<"unusedField", [], unknown, import("@typescript-eslint/utils/ts-eslint").RuleListener> & {
            name: string;
        };
    };
};
export default _default;
