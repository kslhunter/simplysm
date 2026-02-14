import { AST_NODE_TYPES, ASTUtils, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";

/**
 * `@simplysm/core-common`의 `NotImplementedError` 사용을 감지하여 경고하는 ESLint 규칙
 *
 * @remarks
 * 이 규칙은 `@simplysm/core-common`에서 import된 `NotImplementedError`를 `new`로 생성하는 코드를 감지한다.
 * 미구현 코드가 프로덕션에 포함되는 것을 방지한다.
 *
 * 지원하는 import 형태:
 * - named import: `import { NotImplementedError } from "@simplysm/core-common"`
 * - aliased import: `import { NotImplementedError as NIE } from "@simplysm/core-common"`
 * - namespace import: `import * as CC from "@simplysm/core-common"` → `new CC.NotImplementedError()`
 *
 * 동적 import(`await import(...)`)는 감지하지 않는다.
 */
export default createRule({
  name: "ts-no-throw-not-implemented-error",
  meta: {
    type: "suggestion",
    docs: {
      description: "'NotImplementedError' 사용 경고",
    },
    schema: [],
    messages: {
      noThrowNotImplementedError: "{{text}}",
    },
  },
  defaultOptions: [],
  create(context) {
    /**
     * identifier가 @simplysm/core-common에서 import된 것인지 확인
     * @param identifier - 확인할 identifier
     * @param expectedImportedName - named import인 경우 확인할 원본 이름 (namespace import는 undefined)
     * @returns import 출처가 @simplysm/core-common이면 true, 아니면 false
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

        // named/aliased import: import { NotImplementedError } 또는 import { NotImplementedError as NIE }
        if (def.node.type === AST_NODE_TYPES.ImportSpecifier && expectedImportedName != null) {
          const imported = def.node.imported;
          if (imported.type === AST_NODE_TYPES.Identifier && imported.name === expectedImportedName) {
            return true;
          }
        }

        // namespace import: import * as CC
        if (def.node.type === AST_NODE_TYPES.ImportNamespaceSpecifier && expectedImportedName == null) {
          return true;
        }
      }

      return false;
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        let shouldReport = false;

        // Case 1: new NotImplementedError() 또는 new NIE() (named/aliased import)
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

        let msg = "미구현";
        const firstArg = node.arguments.at(0);
        if (firstArg?.type === AST_NODE_TYPES.Literal && typeof firstArg.value === "string" && firstArg.value !== "") {
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
