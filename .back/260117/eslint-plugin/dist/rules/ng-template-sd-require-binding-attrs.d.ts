import { ESLintUtils } from "@typescript-eslint/utils";
export declare const RULE_NAME = "ng-template-sd-require-binding-attrs";
export interface RuleOptions {
    selectorPrefixes?: string[];
    allowAttributes?: string[];
    allowAttributePrefixes?: string[];
}
type Options = [RuleOptions];
declare const _default: ESLintUtils.RuleModule<"requireBindingForAttribute", Options, unknown, ESLintUtils.RuleListener> & {
    name: string;
};
export default _default;
