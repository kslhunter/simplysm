import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";

function traverseNode(
  node: TSESTree.Node,
  callback: (n: TSESTree.Node) => void,
): void {
  callback(node);
  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "range" || key === "loc") continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c != null && typeof c === "object" && "type" in c) {
          traverseNode(c as TSESTree.Node, callback);
        }
      }
    } else if (child != null && typeof child === "object" && "type" in child) {
      traverseNode(child as TSESTree.Node, callback);
    }
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Angular `@Component` 내 미사용 `protected readonly` 필드를 감지하는 ESLint 규칙.
 *
 * @remarks
 * `@Component` 데코레이터가 있는 클래스에서 `protected readonly` 필드가
 * 인라인 템플릿과 클래스 본문 어디에서도 참조되지 않으면 보고합니다.
 * autofix로 해당 필드를 제거합니다.
 */
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
        classNode: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
      ) {
        const componentDecorator = classNode.decorators.find((d) => {
          if (d.expression.type === AST_NODE_TYPES.CallExpression) {
            const callee = d.expression.callee;
            return callee.type === AST_NODE_TYPES.Identifier && callee.name === "Component";
          }
          return false;
        });

        if (componentDecorator == null) return;

        const expr = componentDecorator.expression as TSESTree.CallExpression;
        const args = expr.arguments;
        const firstArg = args.at(0);
        if (firstArg == null || firstArg.type !== AST_NODE_TYPES.ObjectExpression) return;

        const templateProp = firstArg.properties.find(
          (p): p is TSESTree.Property =>
            p.type === AST_NODE_TYPES.Property &&
            p.key.type === AST_NODE_TYPES.Identifier &&
            p.key.name === "template",
        );

        if (templateProp == null) return;

        let templateText = "";
        const templateValue = templateProp.value;
        if (templateValue.type === AST_NODE_TYPES.TemplateLiteral) {
          templateText = templateValue.quasis.map((q) => q.value.raw).join("");
        } else if (
          templateValue.type === AST_NODE_TYPES.Literal &&
          typeof templateValue.value === "string"
        ) {
          templateText = templateValue.value;
        }

        if (templateText === "") return;

        const protectedReadonlyFields = classNode.body.body.filter(
          (node): node is TSESTree.PropertyDefinition =>
            node.type === AST_NODE_TYPES.PropertyDefinition &&
            node.accessibility === "protected" &&
            node.readonly === true &&
            !node.static &&
            node.key.type === AST_NODE_TYPES.Identifier,
        );

        for (const field of protectedReadonlyFields) {
          const fieldName = (field.key as TSESTree.Identifier).name;

          const identifierPattern = new RegExp(
            `(?<![a-zA-Z0-9_$])${escapeRegExp(fieldName)}(?![a-zA-Z0-9_$])`,
          );
          const usedInTemplate = identifierPattern.test(templateText);

          const usedInClass = classNode.body.body.some((member) => {
            if (member === field) return false;
            let found = false;
            traverseNode(member, (node) => {
              if (node.type === AST_NODE_TYPES.Identifier && node.name === fieldName) {
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

                const textBefore = sourceCode.text.slice(0, start);
                const leadingMatch = textBefore.match(/\n[ \t]*$/);
                if (leadingMatch) {
                  start -= leadingMatch[0].length - 1;
                }

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
