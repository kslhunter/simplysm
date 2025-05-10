import ts from "typescript";
import { ESLintUtils } from "@typescript-eslint/utils";

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "지정된 타입이 export API나 public 클래스 멤버에서 노출되는 것을 금지하고, 대체 타입을 안내합니다.",
      recommended: 'error',
    },
    schema: [
      {
        type: "object",
        required: ["types"],
        properties: {
          types: {
            type: "array",
            items: {
              type: "object",
              required: ["ban"],
              properties: {
                ban: { type: "string" },
                safe: { type: "string" },
                ignoreInGeneric: { type: "boolean" },
              },
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noExportedTypes:
        '타입 "{{typeName}}"은(는) 공개적으로 노출되어서는 안됩니다.{{safeSuggestion}}',
    },
  },

  defaultOptions: [{ types: [] }],

  create(context) {
    const optTypes = context.options[0].types;
    const optTypeMap = new Map(optTypes.map(t => [
      t.ban,
      { safe: t.safe ?? undefined, ignoreInGeneric: t.ignoreInGeneric ?? false },
    ]));
    const bannedTypeNames = new Set(optTypes.map(t => t.ban));

    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();
    const typeCache = new WeakMap();

    function getCachedType(tsNode) {
      if (typeCache.has(tsNode)) return typeCache.get(tsNode);
      const type = checker.getTypeAtLocation(tsNode);
      typeCache.set(tsNode, type);
      return type;
    }

    function isBannedTypeRecursive(type) {
      const visited = new Set();

      function visit(t) {
        if (visited.has(t)) return undefined;
        visited.add(t);

        const name = t.aliasSymbol?.escapedName ?? t.symbol?.escapedName;
        if (typeof name === "string" && bannedTypeNames.has(name)) {
          const entry = optTypeMap.get(name);
          if (entry.ignoreInGeneric) return undefined;
          return { ban: name, safe: entry.safe };
        }

        const typeArgs = ("aliasTypeArguments" in t && Array.isArray(t.aliasTypeArguments))
          ? t.aliasTypeArguments
          : (t.flags & ts.TypeFlags.Object && t.objectFlags & ts.ObjectFlags.Reference)
            ? checker.getTypeArguments(t)
            : [];

        for (const arg of typeArgs) {
          const match = visit(arg);
          if (match) return match;
        }

        if (t.isUnionOrIntersection?.()) {
          for (const sub of t.types) {
            const match = visit(sub);
            if (match) return match;
          }
        }

        const elementType = t.getNumberIndexType?.();
        if (elementType) {
          const match = visit(elementType);
          if (match) return match;
        }

        return undefined;
      }

      return visit(type);
    }

    function reportIfBanned(type, node) {
      const match = isBannedTypeRecursive(type);
      if (match) {
        context.report({
          node,
          messageId: "noExportedTypes",
          data: {
            typeName: match.ban,
            safeSuggestion: match.safe
              ? ` 더 안전한 대체 타입 "${match.safe}"을(를) 사용하세요.`
              : "",
          },
        });
      }
    }

    return {
      FunctionDeclaration(node) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
        const isExported =
          (ts.getCombinedModifierFlags(tsNode) & ts.ModifierFlags.Export) !== 0;
        if (!isExported) return;

        const signature = checker.getSignatureFromDeclaration(tsNode);
        if (!signature) return;

        reportIfBanned(checker.getReturnTypeOfSignature(signature), node);

        for (const param of node.params) {
          const tsParam = parserServices.esTreeNodeToTSNodeMap.get(param);
          reportIfBanned(getCachedType(tsParam), param);
        }
      },

      MethodDefinition(node) {
        const isConstructor = node.kind === "constructor";
        const isPublic =
          node.accessibility !== "private" &&
          node.accessibility !== "protected";
        if (!isConstructor && !isPublic) return;

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.value);
        const signature = checker.getSignatureFromDeclaration(tsNode);
        if (!signature) return;

        if (!isConstructor) {
          reportIfBanned(checker.getReturnTypeOfSignature(signature), node);
        }

        for (const param of node.value.params) {
          const tsParam = parserServices.esTreeNodeToTSNodeMap.get(param);
          reportIfBanned(getCachedType(tsParam), param);
        }
      },

      PropertyDefinition(node) {
        const isPublic =
          node.accessibility !== "private" && node.accessibility !== "protected";
        if (!isPublic) return;

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
        reportIfBanned(getCachedType(tsNode), node);
      },

      VariableDeclarator(node) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
        let modParent = tsNode.parent;
        while (modParent && !("modifiers" in modParent)) {
          modParent = modParent.parent;
        }
        if (!modParent || !("modifiers" in modParent)) return;

        const isExported = (modParent.modifiers ?? []).some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        );
        if (!isExported) return;

        let type;
        if (node.id.typeAnnotation) {
          const tsType = parserServices.esTreeNodeToTSNodeMap.get(
            node.id.typeAnnotation.typeAnnotation,
          );
          type = checker.getTypeFromTypeNode(tsType);
        }
        else if (node.init) {
          const tsInit = parserServices.esTreeNodeToTSNodeMap.get(node.init);
          type = getCachedType(tsInit);
        }

        if (type) {
          reportIfBanned(type, node.id);
        }
      },
    };
  },
};
