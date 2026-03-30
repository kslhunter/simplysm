import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";

/**
 * `@simplysm/*` 패키지에서 'src' 하위 경로 import를 금지하는 ESLint 규칙.
 *
 * @remarks
 * 이 규칙이 검사하는 항목:
 * - 정적 import 문: `import ... from '...'`
 * - 동적 import: `import('...')`
 * - 재내보내기 문: `export { ... } from '...'`, `export * from '...'`
 */
export default createRule({
  name: "no-subpath-imports-from-simplysm",
  meta: {
    type: "problem",
    docs: {
      description:
        "@simplysm 패키지에서 'src' 하위 경로 import를 금지합니다. (예: @simplysm/pkg/src/x → 금지)",
    },
    fixable: "code",
    schema: [],
    messages: {
      noSubpathImport:
        "'@simplysm/{{pkg}}' 패키지에서 'src' 하위 경로를 import할 수 없습니다: '{{importPath}}'",
    },
  },
  defaultOptions: [],
  create(context) {
    function checkAndReport(sourceNode: TSESTree.StringLiteral, importPath: string) {
      if (!importPath.startsWith("@simplysm/")) return;

      const parts = importPath.split("/");

      // 허용: @simplysm/pkg, @simplysm/pkg/xxx, @simplysm/pkg/xxx/yyy
      // 금지: @simplysm/pkg/src, @simplysm/pkg/src/xxx
      if (parts.length >= 3 && parts[2] === "src") {
        const fixedPath = `@simplysm/${parts[1]}`;
        context.report({
          node: sourceNode,
          messageId: "noSubpathImport",
          data: {
            pkg: parts[1],
            importPath,
          },
          fix(fixer) {
            const quote = sourceNode.raw[0];
            return fixer.replaceText(sourceNode, `${quote}${fixedPath}${quote}`);
          },
        });
      }
    }

    return {
      // 정적 import: import { x } from '...'
      ImportDeclaration(node) {
        checkAndReport(node.source, node.source.value);
      },

      // 동적 import: import('...')
      ImportExpression(node) {
        if (node.source.type !== AST_NODE_TYPES.Literal) return;
        const importPath = node.source.value;
        if (typeof importPath !== "string") return;
        checkAndReport(node.source, importPath);
      },

      // 재내보내기: export { x } from '...'
      ExportNamedDeclaration(node) {
        if (!node.source) return;
        checkAndReport(node.source, node.source.value);
      },

      // 전체 재내보내기: export * from '...'
      ExportAllDeclaration(node) {
        checkAndReport(node.source, node.source.value);
      },
    };
  },
});
