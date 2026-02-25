import { AST_NODE_TYPES, ASTUtils, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";

/**
 * ESLint rule that detects and warns about the use of `NotImplementedError` from `@simplysm/core-common`.
 *
 * @remarks
 * This rule detects code that instantiates `NotImplementedError` imported from `@simplysm/core-common` using `new`.
 * It prevents unimplemented code from being included in production.
 *
 * Supported import forms:
 * - named import: `import { NotImplementedError } from "@simplysm/core-common"`
 * - aliased import: `import { NotImplementedError as NIE } from "@simplysm/core-common"`
 * - namespace import: `import * as CC from "@simplysm/core-common"` → `new CC.NotImplementedError()`
 *
 * Dynamic imports (`await import(...)`) are not detected.
 */
export default createRule({
  name: "ts-no-throw-not-implemented-error",
  meta: {
    type: "suggestion",
    docs: {
      description: "Warns about 'NotImplementedError' usage",
    },
    schema: [],
    messages: {
      noThrowNotImplementedError: "{{text}}",
    },
  },
  defaultOptions: [],
  create(context) {
    /**
     * Checks if an identifier is imported from @simplysm/core-common.
     * @param identifier - The identifier to check
     * @param expectedImportedName - The original name to check for named imports (undefined for namespace imports)
     * @returns true if the import source is @simplysm/core-common, false otherwise
     */
    function isImportedFromSimplysm(
      identifier: TSESTree.Identifier,
      expectedImportedName: string | undefined,
    ): boolean {
      const scope = context.sourceCode.getScope(identifier);
      const variable = ASTUtils.findVariable(scope, identifier.name);
      if (!variable) return false;

      for (const def of variable.defs) {
        if (def.type !== "ImportBinding") continue;
        if (def.parent.type !== AST_NODE_TYPES.ImportDeclaration) continue;
        if (def.parent.source.value !== "@simplysm/core-common") continue;

        // named/aliased import: import { NotImplementedError } or import { NotImplementedError as NIE }
        if (def.node.type === AST_NODE_TYPES.ImportSpecifier && expectedImportedName != null) {
          const imported = def.node.imported;
          if (
            imported.type === AST_NODE_TYPES.Identifier &&
            imported.name === expectedImportedName
          ) {
            return true;
          }
        }

        // namespace import: import * as CC
        if (
          def.node.type === AST_NODE_TYPES.ImportNamespaceSpecifier &&
          expectedImportedName == null
        ) {
          return true;
        }
      }

      return false;
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        let shouldReport = false;

        // Case 1: new NotImplementedError() or new NIE() (named/aliased import)
        if (node.callee.type === AST_NODE_TYPES.Identifier) {
          shouldReport = isImportedFromSimplysm(node.callee, "NotImplementedError");
        }

        // Case 2: new CC.NotImplementedError() (namespace import)
        else if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === "NotImplementedError" &&
          node.callee.object.type === AST_NODE_TYPES.Identifier
        ) {
          shouldReport = isImportedFromSimplysm(node.callee.object, undefined);
        }

        if (!shouldReport) return;

        let msg = "Not implemented";
        const firstArg = node.arguments.at(0);
        if (
          firstArg?.type === AST_NODE_TYPES.Literal &&
          typeof firstArg.value === "string" &&
          firstArg.value !== ""
        ) {
          msg = firstArg.value;
        }

        context.report({
          node,
          messageId: "noThrowNotImplementedError",
          data: { text: msg },
        });
      },
    };
  },
});
