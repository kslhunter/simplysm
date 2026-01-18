import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";
import { traverseNode } from "../utils/traverse";
import { escapeRegExp } from "../utils/escape-regexp";
import { extractComponentTemplate } from "../utils/angular-template";

export default createRule({
  name: "ts-no-unused-injects",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow unused Angular inject() fields",
    },
    fixable: "code",
    messages: {
      unusedInject: 'inject() field "{{name}}" is never used.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      "ClassDeclaration, ClassExpression"(
        classNode: TSESTree.ClassDeclaration | TSESTree.ClassExpression
      ) {
        const classBody = classNode.body;

        // inject() 호출로 초기화된 필드 수집
        const injectFields = classBody.body.filter(
          (node): node is TSESTree.PropertyDefinition =>
            node.type === AST_NODE_TYPES.PropertyDefinition &&
            node.value?.type === AST_NODE_TYPES.CallExpression &&
            node.value.callee.type === AST_NODE_TYPES.Identifier &&
            node.value.callee.name === "inject" &&
            node.key.type === AST_NODE_TYPES.Identifier
        );

        if (injectFields.length === 0) return;

        // 템플릿 텍스트 추출 (있는 경우)
        const templateText = extractComponentTemplate(classNode);

        for (const field of injectFields) {
          const fieldKey = field.key as TSESTree.Identifier;
          const fieldName = fieldKey.name;

          // 템플릿에서 사용 여부 확인
          let usedInTemplate = false;
          if (templateText) {
            const identifierPattern = new RegExp(
              `(?<![a-zA-Z0-9_$])${escapeRegExp(fieldName)}(?![a-zA-Z0-9_$])`
            );
            usedInTemplate = identifierPattern.test(templateText);
          }

          // 클래스 내에서 해당 이름의 참조가 있는지 확인 (선언부 제외)
          // traverseNode가 false를 반환하면 조기 종료된 것 = 참조 발견됨
          const usedInClass = !traverseNode(classBody, (node) => {
            if (node.type === AST_NODE_TYPES.Identifier && node.name === fieldName && node !== fieldKey) {
              return false; // 조기 종료
            }
            return true;
          });

          if (!usedInTemplate && !usedInClass) {
            context.report({
              node: field,
              messageId: "unusedInject",
              data: { name: fieldName },
              fix(fixer) {
                // 필드 전체 라인 삭제 (앞뒤 공백/개행 포함)
                const tokenBefore = sourceCode.getTokenBefore(field);

                const start = tokenBefore ? tokenBefore.range[1] : field.range[0];
                const end = field.range[1];

                return fixer.removeRange([start, end]);
              },
            });
          }
        }
      },
    };
  },
});
