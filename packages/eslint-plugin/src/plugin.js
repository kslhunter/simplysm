import tsNoThrowNotImplementError from "./rules/ts-no-throw-not-implement-error.js";
import ngTemplateNoTodoComments from "./rules/ng-template-no-todo-comments.js";
import tsNoExportedTypes from "./rules/ts-no-exported-types.js";
import tsNoBufferInTypedArrayContext from "./rules/ts-no-buffer-in-typedarray-context.js";
import noSubpathImportsFromSimplysm from "./rules/no-subpath-imports-from-simplysm.js";
import ngTemplateSdRequireBindingAttrs from "./rules/ng-template-sd-require-binding-attrs.js";
import noHardPrivate from "./rules/no-hard-private.js";

export default {
  rules: {
    "ts-no-throw-not-implement-error": tsNoThrowNotImplementError,
    "ts-no-exported-types": tsNoExportedTypes,
    "ts-no-buffer-in-typedarray-context": tsNoBufferInTypedArrayContext,
    "ng-template-no-todo-comments": ngTemplateNoTodoComments,
    "no-subpath-imports-from-simplysm": noSubpathImportsFromSimplysm,
    "ng-template-sd-require-binding-attrs": ngTemplateSdRequireBindingAttrs,
    "no-hard-private": noHardPrivate,
  },
};
