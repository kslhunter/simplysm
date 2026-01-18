import { ESLintUtils } from "@typescript-eslint/utils";
export interface TypeConfig {
    ban: string;
    safe?: string;
    ignoreInGeneric?: boolean;
}
type Options = [{
    types: TypeConfig[];
}];
declare const _default: ESLintUtils.RuleModule<"noExportedTypes", Options, unknown, ESLintUtils.RuleListener> & {
    name: string;
};
export default _default;
