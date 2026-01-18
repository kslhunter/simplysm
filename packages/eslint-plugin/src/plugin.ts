import noHardPrivate from "./rules/no-hard-private";
import noSubpathImportsFromSimplysm from "./rules/no-subpath-imports-from-simplysm";
import tsNoThrowNotImplementedError from "./rules/ts-no-throw-not-implemented-error";

export default {
  rules: {
    "no-hard-private": noHardPrivate,
    "no-subpath-imports-from-simplysm": noSubpathImportsFromSimplysm,
    "ts-no-throw-not-implemented-error": tsNoThrowNotImplementedError,
  },
};
