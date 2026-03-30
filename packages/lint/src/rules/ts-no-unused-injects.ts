import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";

function traverseNode(node: TSESTree.Node, callback: (n: TSESTree.Node) => void): void {
  callback(node);
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
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

/**
 * 미사용 Angular `inject()` 필드를 감지하는 ESLint 규칙.
 *
 * @remarks
 * 클래스 내에서 `inject()` 호출로 초기화된 프로퍼티 중
 * 같은 클래스 내 다른 곳에서 참조되지 않는 필드를 보고합니다.
 * autofix로 해당 필드를 제거합니다.
 */
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
      ClassBody(classBody: TSESTree.ClassBody) {
        const injectFields = classBody.body.filter(
          (node): node is TSESTree.PropertyDefinition =>
            node.type === AST_NODE_TYPES.PropertyDefinition &&
            node.value != null &&
            node.value.type === AST_NODE_TYPES.CallExpression &&
            node.value.callee.type === AST_NODE_TYPES.Identifier &&
            node.value.callee.name === "inject" &&
            node.key.type === AST_NODE_TYPES.Identifier,
        );

        for (const field of injectFields) {
          const fieldName = (field.key as TSESTree.Identifier).name;

          const allIdentifiers: TSESTree.Identifier[] = [];
          traverseNode(classBody, (node) => {
            if (node.type === AST_NODE_TYPES.Identifier && node.name === fieldName) {
              allIdentifiers.push(node);
            }
          });

          const references = allIdentifiers.filter((id) => id !== field.key);

          if (references.length === 0) {
            context.report({
              node: field,
              messageId: "unusedInject",
              data: { name: fieldName },
              fix(fixer) {
                const tokenBefore = sourceCode.getTokenBefore(field);
                const tokenAfter = sourceCode.getTokenAfter(field);
                const start = tokenBefore ? tokenBefore.range[1] : field.range[0];
                const end = tokenAfter ? field.range[1] : field.range[1];
                return fixer.removeRange([start, end]);
              },
            });
          }
        }
      },
    };
  },
});
