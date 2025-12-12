export default {
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
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      ClassDeclaration(classNode) {
        // @Component 데코레이터 찾기
        const componentDecorator = classNode.decorators?.find(
          (d) =>
            d.expression?.type === "CallExpression" && d.expression.callee?.name === "Component",
        );

        if (!componentDecorator) return;

        // template 문자열 추출
        const decoratorArg = componentDecorator.expression.arguments?.[0];
        if (decoratorArg?.type !== "ObjectExpression") return;

        const templateProp = decoratorArg.properties.find((p) => p.key?.name === "template");
        if (!templateProp) return;

        const templateValue = templateProp.value;
        let templateText = "";

        if (templateValue.type === "TemplateLiteral") {
          templateText = templateValue.quasis.map((q) => q.value.raw).join("");
        } else if (templateValue.type === "Literal") {
          templateText = String(templateValue.value);
        }

        if (!templateText) return;

        // protected readonly 필드 수집
        const protectedReadonlyFields = classNode.body.body.filter(
          (node) =>
            node.type === "PropertyDefinition" &&
            node.accessibility === "protected" &&
            node.readonly === true &&
            !node.static &&
            node.key?.type === "Identifier",
        );

        for (const field of protectedReadonlyFields) {
          const fieldName = field.key.name;

          // 템플릿에서 사용 여부 (바인딩 컨텍스트)
          const usedInTemplate =
            templateText.includes(fieldName) && new RegExp(`\\b${fieldName}\\b`).test(templateText);

          // 클래스 내 다른 곳에서 참조 여부
          const allIdentifiers = [];
          traverseNode(classNode.body, (node) => {
            if (node.type === "Identifier" && node.name === fieldName) {
              allIdentifiers.push(node);
            }
          });

          const usedInClass = allIdentifiers.some((id) => id !== field.key);

          if (!usedInTemplate && !usedInClass) {
            context.report({
              node: field,
              messageId: "unusedField",
              data: { name: fieldName },
              fix(fixer) {
                const tokenBefore = sourceCode.getTokenBefore(field);
                const start = tokenBefore ? tokenBefore.range[1] : field.range[0];
                return fixer.removeRange([start, field.range[1]]);
              },
            });
          }
        }
      },
    };
  },
};

function traverseNode(node, callback) {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => traverseNode(c, callback));
    } else if (child && typeof child === "object" && child.type) {
      traverseNode(child, callback);
    }
  }
}
