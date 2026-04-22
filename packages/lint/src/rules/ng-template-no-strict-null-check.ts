import { getTemplateParserServices } from "@angular-eslint/utils";
import { createRule } from "../utils/create-rule";

/**
 * Angular 템플릿에서 `=== null`, `!== null`, `=== undefined`, `!== undefined` 사용을 금지하는 ESLint 규칙.
 *
 * @remarks
 * `== null` / `!= null`로 통일하도록 강제합니다.
 * 인라인 템플릿에서 offset 매핑 문제로 autofix는 제공하지 않습니다.
 */
export default createRule({
  name: "ng-template-no-strict-null-check",
  meta: {
    type: "problem",
    docs: {
      description:
        "Angular 템플릿에서 `=== null`, `!== null`, `=== undefined`, `!== undefined`를 금지합니다. `== null` / `!= null`을 사용하세요.",
    },
    schema: [],
    messages: {
      noStrictNullCheck:
        '`{{actual}}`을 사용하지 마세요. `{{replacement}}`를 사용하세요.',
    },
  },
  defaultOptions: [],
  create(context) {
    const parserServices = getTemplateParserServices(context);
    const sourceCode = context.sourceCode;

    return {
      'Binary[operation=/^(===|!==)$/]'(
        node: {
          left: { value?: unknown; span: { start: number; end: number } };
          right: { value?: unknown; span: { start: number; end: number } };
          operation: "===" | "!==";
          sourceSpan: { start: number; end: number };
        },
      ) {
        const { left, right, operation } = node;
        const leftIsNil = isNilValue(left);
        const rightIsNil = isNilValue(right);
        if (!leftIsNil && !rightIsNil) return;

        const looseOp = operation === "===" ? "==" : "!=";
        const nilSide = leftIsNil ? left : right;
        const otherSide = leftIsNil ? right : left;

        const actualText = `${getNodeText(otherSide, sourceCode)} ${operation} ${getNodeText(nilSide, sourceCode)}`;
        const replacementText = `${getNodeText(otherSide, sourceCode)} ${looseOp} null`;

        const loc = parserServices.convertNodeSourceSpanToLoc(node.sourceSpan as never);

        context.report({
          loc,
          messageId: "noStrictNullCheck",
          data: {
            actual: actualText,
            replacement: replacementText,
          },
        });
      },
    };
  },
});

function isNilValue(node: { value?: unknown }): boolean {
  return "value" in node && node.value == null;
}

function getNodeText(
  node: { span: { start: number; end: number } },
  sourceCode: { getText(): string },
): string {
  return sourceCode.getText().slice(node.span.start, node.span.end);
}
