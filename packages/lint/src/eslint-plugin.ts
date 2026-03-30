import ngTemplateNoTodoComments from "./rules/ng-template-no-todo-comments";
import ngTemplateSdRequireBindingAttrs from "./rules/ng-template-sd-require-binding-attrs";
import noHardPrivate from "./rules/no-hard-private";
import noSubpathImportsFromSimplysm from "./rules/no-subpath-imports-from-simplysm";
import tsNoThrowNotImplementedError from "./rules/ts-no-throw-not-implemented-error";
import tsNoUnusedInjects from "./rules/ts-no-unused-injects";
import tsNoUnusedProtectedReadonly from "./rules/ts-no-unused-protected-readonly";

export default {
  rules: {
    "ng-template-no-todo-comments": ngTemplateNoTodoComments,
    "ng-template-sd-require-binding-attrs": ngTemplateSdRequireBindingAttrs,
    "no-hard-private": noHardPrivate,
    "no-subpath-imports-from-simplysm": noSubpathImportsFromSimplysm,
    "ts-no-throw-not-implemented-error": tsNoThrowNotImplementedError,
    "ts-no-unused-injects": tsNoUnusedInjects,
    "ts-no-unused-protected-readonly": tsNoUnusedProtectedReadonly,
  },
};
