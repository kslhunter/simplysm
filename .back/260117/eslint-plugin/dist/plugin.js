import tsNoThrowNotImplementError from "./rules/ts-no-throw-not-implement-error";
import ngTemplateNoTodoComments from "./rules/ng-template-no-todo-comments";
import tsNoExportedTypes from "./rules/ts-no-exported-types";
import tsNoBufferInTypedArrayContext from "./rules/ts-no-buffer-in-typedarray-context";
import noSubpathImportsFromSimplysm from "./rules/no-subpath-imports-from-simplysm";
import ngTemplateSdRequireBindingAttrs from "./rules/ng-template-sd-require-binding-attrs";
import noHardPrivate from "./rules/no-hard-private";
import tsNoUnusedInjects from "./rules/ts-no-unused-injects";
import tsNoUnusedProtectedReadonly from "./rules/ts-no-unused-protected-readonly";
export default {
    rules: {
        "ts-no-throw-not-implement-error": tsNoThrowNotImplementError,
        "ts-no-exported-types": tsNoExportedTypes,
        "ts-no-buffer-in-typedarray-context": tsNoBufferInTypedArrayContext,
        "ng-template-no-todo-comments": ngTemplateNoTodoComments,
        "no-subpath-imports-from-simplysm": noSubpathImportsFromSimplysm,
        "ng-template-sd-require-binding-attrs": ngTemplateSdRequireBindingAttrs,
        "no-hard-private": noHardPrivate,
        "ts-no-unused-injects": tsNoUnusedInjects,
        "ts-no-unused-protected-readonly": tsNoUnusedProtectedReadonly,
    },
};
//# sourceMappingURL=plugin.js.map