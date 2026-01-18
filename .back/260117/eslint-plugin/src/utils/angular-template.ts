import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

/**
 * 클래스에서 @Component 데코레이터를 찾습니다.
 *
 * @param classNode - 검사할 클래스 노드
 * @returns @Component 데코레이터 또는 undefined
 */
export function findComponentDecorator(
  classNode: TSESTree.ClassDeclaration | TSESTree.ClassExpression
): TSESTree.Decorator | undefined {
  return classNode.decorators.find((d) => {
    if (d.expression.type === AST_NODE_TYPES.CallExpression) {
      const callee = d.expression.callee;
      return callee.type === AST_NODE_TYPES.Identifier && callee.name === "Component";
    }
    return false;
  });
}

/**
 * @Component 데코레이터에서 inline template 문자열을 추출합니다.
 * templateUrl은 지원하지 않습니다 (외부 파일 참조 불가).
 *
 * @param classNode - 검사할 클래스 노드
 * @returns 템플릿 문자열 또는 빈 문자열
 */
export function extractComponentTemplate(
  classNode: TSESTree.ClassDeclaration | TSESTree.ClassExpression
): string {
  const componentDecorator = findComponentDecorator(classNode);
  if (componentDecorator === undefined) return "";

  const decoratorExpr = componentDecorator.expression as TSESTree.CallExpression;
  const args = decoratorExpr.arguments;
  const firstArg = args[0] as TSESTree.Node | undefined;

  if (firstArg === undefined || firstArg.type !== AST_NODE_TYPES.ObjectExpression) {
    return "";
  }

  const templateProp = firstArg.properties.find(
    (p): p is TSESTree.Property =>
      p.type === AST_NODE_TYPES.Property &&
      p.key.type === AST_NODE_TYPES.Identifier &&
      p.key.name === "template"
  );

  if (!templateProp) return "";

  const templateValue = templateProp.value;

  if (templateValue.type === AST_NODE_TYPES.TemplateLiteral) {
    return templateValue.quasis.map((q) => q.value.raw).join("");
  } else if (templateValue.type === AST_NODE_TYPES.Literal && typeof templateValue.value === "string") {
    return templateValue.value;
  }

  return "";
}
