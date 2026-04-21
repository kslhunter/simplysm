import { AST_NODE_TYPES, ASTUtils, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";

/**
 * `@angular/core`의 `effect()`에 async 함수를 직접 전달하는 것을 금지하는 ESLint 규칙.
 *
 * @remarks
 * `effect(async () => { ... })`처럼 effect 콜백을 async로 선언하면, `await` 이후에 읽은 signal은
 * 반응형(reactive) 컨텍스트를 벗어나 의존성으로 추적되지 않는다. 또한 콜백의 반환값이 `Promise<void>`가
 * 되어 `EffectCleanupFn` 등록 기능도 사용할 수 없다.
 *
 * 비동기 작업이 필요한 경우 다음 패턴을 사용한다.
 *
 * ```typescript
 * effect(() => {
 *   this.someSignal();
 *   void untracked(async () => {
 *     await this.doAsync();
 *   });
 * });
 * ```
 *
 * 지원하는 import 형태:
 * - named import: `import { effect } from "@angular/core"`
 * - aliased import: `import { effect as ngEffect } from "@angular/core"`
 * - namespace import: `import * as ng from "@angular/core"` → `ng.effect(...)`
 *
 * 다른 모듈에서 import한 `effect` 또는 로컬에 선언된 `effect`는 감지하지 않는다.
 */
export default createRule({
  name: "ng-no-async-effect",
  meta: {
    type: "problem",
    docs: {
      description: "Angular effect()에 async 함수를 직접 전달하지 못하도록 합니다",
    },
    schema: [],
    messages: {
      noAsyncEffect:
        "effect()에 async 함수를 직접 전달하지 마세요. " +
        "await 이후의 signal read는 의존성으로 추적되지 않습니다. " +
        "비동기 작업은 `void untracked(async () => { ... })` 내부에서 수행하세요.",
    },
  },
  defaultOptions: [],
  create(context) {
    /**
     * 식별자가 @angular/core에서 import되었는지 확인한다.
     * @param identifier - 확인할 식별자
     * @param expectedImportedName - named import에서 확인할 원래 이름 (namespace import의 경우 undefined)
     */
    function isImportedFromAngularCore(
      identifier: TSESTree.Identifier,
      expectedImportedName: string | undefined,
    ): boolean {
      const scope = context.sourceCode.getScope(identifier);
      const variable = ASTUtils.findVariable(scope, identifier.name);
      if (!variable) return false;

      for (const def of variable.defs) {
        if (def.type !== "ImportBinding") continue;
        if (def.parent.type !== AST_NODE_TYPES.ImportDeclaration) continue;
        if (def.parent.source.value !== "@angular/core") continue;

        // named/aliased import: import { effect } 또는 import { effect as ngEffect }
        if (def.node.type === AST_NODE_TYPES.ImportSpecifier && expectedImportedName != null) {
          const imported = def.node.imported;
          if (
            imported.type === AST_NODE_TYPES.Identifier &&
            imported.name === expectedImportedName
          ) {
            return true;
          }
        }

        // namespace import: import * as ng
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
      CallExpression(node: TSESTree.CallExpression) {
        let isAngularEffect = false;

        // 케이스 1: effect(...) 또는 aliased된 effect (named import)
        if (node.callee.type === AST_NODE_TYPES.Identifier) {
          isAngularEffect = isImportedFromAngularCore(node.callee, "effect");
        }

        // 케이스 2: ng.effect(...) (namespace import)
        else if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === "effect" &&
          node.callee.object.type === AST_NODE_TYPES.Identifier
        ) {
          isAngularEffect = isImportedFromAngularCore(node.callee.object, undefined);
        }

        if (!isAngularEffect) return;

        const firstArg = node.arguments.at(0);
        if (firstArg == null) return;

        const isAsyncFunction =
          (firstArg.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            firstArg.type === AST_NODE_TYPES.FunctionExpression) &&
          firstArg.async;

        if (!isAsyncFunction) return;

        context.report({
          node: firstArg,
          messageId: "noAsyncEffect",
        });
      },
    };
  },
});
