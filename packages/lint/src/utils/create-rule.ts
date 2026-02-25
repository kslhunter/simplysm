import { ESLintUtils } from "@typescript-eslint/utils";

/**
 * Factory function to create ESLint rules.
 *
 * @remarks
 * Wraps `RuleCreator` from `@typescript-eslint/utils` and
 * automatically generates rule documentation URLs.
 *
 * @example
 * ```typescript
 * export default createRule({
 *   name: "my-rule",
 *   meta: { ... },
 *   defaultOptions: [],
 *   create(context) { ... },
 * });
 * ```
 */
export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/kslhunter/simplysm/blob/master/packages/eslint-plugin/README.md#${name}`,
);
