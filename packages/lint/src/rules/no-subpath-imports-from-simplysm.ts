import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";

/**
 * ESLint rule that prohibits 'src' subpath imports from `@simplysm/*` packages.
 *
 * @remarks
 * This rule checks:
 * - Static import statements: `import ... from '...'`
 * - Dynamic imports: `import('...')`
 * - Re-export statements: `export { ... } from '...'`, `export * from '...'`
 */
export default createRule({
  name: "no-subpath-imports-from-simplysm",
  meta: {
    type: "problem",
    docs: {
      description:
        "Prohibits 'src' subpath imports from @simplysm packages. (e.g., @simplysm/pkg/src/x → prohibited)",
    },
    fixable: "code",
    schema: [],
    messages: {
      noSubpathImport:
        "Cannot import 'src' subpath from '@simplysm/{{pkg}}' package: '{{importPath}}'",
    },
  },
  defaultOptions: [],
  create(context) {
    function checkAndReport(sourceNode: TSESTree.StringLiteral, importPath: string) {
      if (!importPath.startsWith("@simplysm/")) return;

      const parts = importPath.split("/");

      // Allowed: @simplysm/pkg, @simplysm/pkg/xxx, @simplysm/pkg/xxx/yyy
      // Prohibited: @simplysm/pkg/src, @simplysm/pkg/src/xxx
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
      // Static import: import { x } from '...'
      ImportDeclaration(node) {
        checkAndReport(node.source, node.source.value);
      },

      // Dynamic import: import('...')
      ImportExpression(node) {
        if (node.source.type !== AST_NODE_TYPES.Literal) return;
        const importPath = node.source.value;
        if (typeof importPath !== "string") return;
        checkAndReport(node.source, importPath);
      },

      // Re-export: export { x } from '...'
      ExportNamedDeclaration(node) {
        if (!node.source) return;
        checkAndReport(node.source, node.source.value);
      },

      // Re-export all: export * from '...'
      ExportAllDeclaration(node) {
        checkAndReport(node.source, node.source.value);
      },
    };
  },
});
