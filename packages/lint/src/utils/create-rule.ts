import { ESLintUtils } from "@typescript-eslint/utils";

/**
 * ESLint 규칙을 생성하는 팩토리 함수
 *
 * @remarks
 * `@typescript-eslint/utils`의 `RuleCreator`를 래핑하여
 * 규칙 문서 URL을 자동으로 생성한다.
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
