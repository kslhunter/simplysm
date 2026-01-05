import { TSESTree } from "@typescript-eslint/utils";
import { createRule, traverseNode, escapeRegExp } from "../utils";

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
        // @Component 데코레이터 찾기
        const componentDecorator = classNode.decorators.find((d) => {
          if (d.expression.type === "CallExpression") {
            const callee = d.expression.callee;
            return callee.type === "Identifier" && callee.name === "Component";
          }
          return false;
        });

        if (componentDecorator === undefined) return;

        // template 문자열 추출
        const decoratorExpr = componentDecorator.expression as TSESTree.CallExpression;
        const args = decoratorExpr.arguments;
        const firstArg = args[0] as TSESTree.Node | undefined;
        if (firstArg === undefined || firstArg.type !== "ObjectExpression") return;

        const templateProp = firstArg.properties.find(
          (p): p is TSESTree.Property =>
            p.type === "Property" &&
            p.key.type === "Identifier" &&
            p.key.name === "template"
        );

        if (!templateProp) return;

        let templateText = "";
        const templateValue = templateProp.value;

        if (templateValue.type === "TemplateLiteral") {
          templateText = templateValue.quasis.map((q) => q.value.raw).join("");
        } else if (templateValue.type === "Literal" && typeof templateValue.value === "string") {
          templateText = templateValue.value;
        }

        if (!templateText) return;

        // protected readonly 필드 수집
        const protectedReadonlyFields = classNode.body.body.filter(
          (node): node is TSESTree.PropertyDefinition =>
            node.type === "PropertyDefinition" &&
            node.accessibility === "protected" &&
            node.readonly === true &&
            !node.static &&
            node.key.type === "Identifier"
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

            let found = false;
            traverseNode(member, (node) => {
              if (node.type === "Identifier" && node.name === fieldName) {
                found = true;
              }
            });
            return found;
          });

          if (!usedInTemplate && !usedInClass) {
            context.report({
              node: field,
              messageId: "unusedField",
              data: { name: fieldName },
              fix(fixer) {
                let start = field.range[0];
                let end = field.range[1];

                // 앞쪽 공백/줄바꿈 포함
                const textBefore = sourceCode.text.slice(0, start);
                const leadingMatch = textBefore.match(/\n[ \t]*$/);
                if (leadingMatch) {
                  start -= leadingMatch[0].length - 1;
                }

                // 뒤쪽 세미콜론과 줄바꿈까지 포함
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
