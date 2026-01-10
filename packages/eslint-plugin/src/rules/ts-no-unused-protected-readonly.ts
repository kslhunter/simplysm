import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/createRule";
import { traverseNode } from "../utils/traverse";
import { escapeRegExp } from "../utils/escapeRegExp";
import { extractComponentTemplate, findComponentDecorator } from "../utils/angular-template";

export default createRule({
  name: "ts-no-unused-protected-readonly",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow unused protected readonly fields in Angular components",
    },
    fixable: "code",
    messages: {
      unusedField: 'Protected readonly field "{{name}}" is not used in class or template.',
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
        // @Component 데코레이터가 있는지 확인
        const componentDecorator = findComponentDecorator(classNode);
        if (componentDecorator === undefined) return;

        // template 문자열 추출
        const templateText = extractComponentTemplate(classNode);
        if (!templateText) return;

        // protected readonly 필드 수집
        const protectedReadonlyFields = classNode.body.body.filter(
          (node): node is TSESTree.PropertyDefinition =>
            node.type === AST_NODE_TYPES.PropertyDefinition &&
            node.accessibility === "protected" &&
            node.readonly === true &&
            !node.static &&
            node.key.type === AST_NODE_TYPES.Identifier
        );

        for (const field of protectedReadonlyFields) {
          const fieldKey = field.key as TSESTree.Identifier;
          const fieldName = fieldKey.name;

          // 템플릿에서 사용 여부
          // \b는 $로 시작하는 identifier에서 동작 안 함 → lookahead/lookbehind 사용
          const identifierPattern = new RegExp(
            `(?<![a-zA-Z0-9_$])${escapeRegExp(fieldName)}(?![a-zA-Z0-9_$])`
          );
          const usedInTemplate = identifierPattern.test(templateText);

          // 클래스 내 다른 곳에서 참조 여부 (해당 필드 선언부 제외)
          const usedInClass = classNode.body.body.some((member) => {
            if (member === field) return false;

            // traverseNode가 false를 반환하면 조기 종료된 것 = 참조 발견됨
            return !traverseNode(member, (node) => {
              if (node.type === AST_NODE_TYPES.Identifier && node.name === fieldName) {
                return false; // 조기 종료
              }
              return true;
            });
          });

          if (!usedInTemplate && !usedInClass) {
            context.report({
              node: field,
              messageId: "unusedField",
              data: { name: fieldName },
              fix(fixer) {
                let start = field.range[0];
                let end = field.range[1];

                // 앞쪽 줄바꿈과 들여쓰기 공백 포함 (Windows \r\n 및 Unix \n 모두 지원)
                const textBefore = sourceCode.text.slice(0, start);
                const leadingMatch = textBefore.match(/(\r?\n)([ \t]*)$/);
                if (leadingMatch) {
                  // 줄바꿈 이후의 들여쓰기 공백만 제거 (줄바꿈 자체는 유지)
                  start -= leadingMatch[2].length;
                }

                // 뒤쪽 세미콜론과 줄바꿈까지 포함 (Windows \r\n 및 Unix \n 모두 지원)
                const afterText = sourceCode.text.slice(end);
                const trailingMatch = afterText.match(/^;?[ \t]*\r?\n/);
                if (trailingMatch) {
                  end += trailingMatch[0].length;
                }

                return fixer.removeRange([start, end]);
              },
            });
          }
        }
      },
    };
  },
});
