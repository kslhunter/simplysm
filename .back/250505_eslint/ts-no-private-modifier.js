import { AST_NODE_TYPES } from "@typescript-eslint/utils";

export default {
  meta: {
    type: "problem",
    docs: {
      description: "'private' 키워드는 금지됩니다. 'protected'로 자동 변환할 수 있습니다.",
    },
    schema: [],
    fixable: "code",
    messages: {
      noPrivate: "'private' 접근자 사용 금지. ('protected' 사용)",
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();

    function reportAndFixPrivate(node, start, end) {
      context.report({
        node,
        messageId: "noPrivate",
        fix: fixer => fixer.replaceTextRange(
          [start, end],
          sourceCode.getText().slice(start, end).replace(/\bprivate\b/, "protected"),
        ),
      });
    }

    function visitAccessibilityNode(node) {
      if (node.accessibility === "private") {
        // "private" 토큰부터 key 시작 전까지 치환
        const start = node.range[0];
        const end = node.key.range[0];
        reportAndFixPrivate(node, start, end);
      }
    }

    function visitInterfaceModifierNode(node) {
      const modifiers = node.modifiers ?? [];
      for (const mod of modifiers) {
        if (
          mod.type === AST_NODE_TYPES.TSAccessibilityKeyword &&
          mod.kind === "private"
        ) {
          reportAndFixPrivate(mod, mod.range[0], mod.range[1]);
        }
      }
    }

    return {
      MethodDefinition: visitAccessibilityNode,
      PropertyDefinition: visitAccessibilityNode,
      TSPropertySignature: visitInterfaceModifierNode,
      TSMethodSignature: visitInterfaceModifierNode,
      TSParameterProperty(node) {
        if (node.accessibility === "private") {
          reportAndFixPrivate(node, node.range[0], node.range[1]);
        }
      },
    };
  },
};
