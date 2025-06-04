export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "@simplysm 패키지에서 서브경로 import를 금지합니다. (ex: @simplysm/pkg/dist/x → 금지)",
      recommended: "error",
    },
    schema: [],
    messages: {
      noSubpathImport:
        "'@simplysm/{{pkg}}' 패키지는 루트까지만 import 가능합니다. 서브 경로(import '{{importPath}}')를 사용하지 마세요.",
    },
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;

        if (typeof importPath !== "string") return;

        if (importPath.startsWith("@simplysm/")) {
          const parts = importPath.split("/");
          // @simplysm/pkg (length 2)는 허용. 그 외는 금지.
          if (parts.length > 2) {
            context.report({
              node: node.source,
              messageId: "noSubpathImport",
              data: {
                pkg: parts[1],
                importPath,
              },
            });
          }
        }
      },
    };
  },
};
