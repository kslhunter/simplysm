import ts from "typescript";
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";
import { createTypeCacheHelper } from "../utils/type-checker";

export interface TypeConfig {
  ban: string;
  safe?: string;
  ignoreInGeneric?: boolean;
}

type Options = [{ types: TypeConfig[] }];
type MessageIds = "noExportedTypes";

export default createRule<Options, MessageIds>({
  name: "ts-no-exported-types",
  meta: {
    type: "problem",
    docs: {
      description:
        "지정된 타입이 export API나 public 클래스 멤버에서 노출되는 것을 금지하고, 대체 타입을 안내합니다.",
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
    const optTypeMap = new Map(
      optTypes.map((t) => [
        t.ban,
        { safe: t.safe ?? undefined, ignoreInGeneric: t.ignoreInGeneric ?? false },
      ])
    );
    const bannedTypeNames = new Set(optTypes.map((t) => t.ban));

    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();
    const { getCachedType } = createTypeCacheHelper(checker);

    function isBannedTypeRecursive(
      type: ts.Type
    ): { ban: string; safe: string | undefined } | undefined {
      const visited = new Set<ts.Type>();

      function visit(t: ts.Type): { ban: string; safe: string | undefined } | undefined {
        if (visited.has(t)) return undefined;
        visited.add(t);

        const aliasSymbol = (t as ts.Type & { aliasSymbol?: ts.Symbol }).aliasSymbol;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const name = aliasSymbol?.escapedName ?? t.symbol?.escapedName;
        if (typeof name === "string" && bannedTypeNames.has(name)) {
          const entry = optTypeMap.get(name)!;
          if (entry.ignoreInGeneric) return undefined;
          return { ban: name, safe: entry.safe };
        }

        const aliasTypeArguments = (t as ts.Type & { aliasTypeArguments?: readonly ts.Type[] })
          .aliasTypeArguments;
        const typeArgs =
          aliasTypeArguments && Array.isArray(aliasTypeArguments)
            ? aliasTypeArguments
            : t.flags & ts.TypeFlags.Object &&
                (t as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference
              ? checker.getTypeArguments(t as ts.TypeReference)
              : [];

        for (const arg of typeArgs) {
          const match = visit(arg);
          if (match) return match;
        }

        if (t.isUnionOrIntersection()) {
          for (const sub of t.types) {
            const match = visit(sub);
            if (match) return match;
          }
        }

        const elementType = t.getNumberIndexType();
        if (elementType) {
          const match = visit(elementType);
          if (match) return match;
        }

        return undefined;
      }

      return visit(type);
    }

    function reportIfBanned(type: ts.Type, node: TSESTree.Node): void {
      const match = isBannedTypeRecursive(type);
      if (match) {
        context.report({
          node,
          messageId: "noExportedTypes",
          data: {
            typeName: match.ban,
            safeSuggestion:
              match.safe != null
                ? ` 더 안전한 대체 타입 "${match.safe}"을(를) 사용하세요.`
                : "",
          },
        });
      }
    }

    return {
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
        const isExported =
          (ts.getCombinedModifierFlags(tsNode as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
        if (!isExported) return;

        const signature = checker.getSignatureFromDeclaration(
          tsNode as ts.SignatureDeclaration
        );
        if (!signature) return;

        reportIfBanned(checker.getReturnTypeOfSignature(signature), node);

        for (const param of node.params) {
          const tsParam = parserServices.esTreeNodeToTSNodeMap.get(param);
          reportIfBanned(getCachedType(tsParam), param);
        }
      },

      MethodDefinition(node: TSESTree.MethodDefinition) {
        const isConstructor = node.kind === "constructor";
        const isPublic =
          node.accessibility !== "private" && node.accessibility !== "protected";
        if (!isConstructor && !isPublic) return;

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.value);
        const signature = checker.getSignatureFromDeclaration(
          tsNode as ts.SignatureDeclaration
        );
        if (!signature) return;

        if (!isConstructor) {
          reportIfBanned(checker.getReturnTypeOfSignature(signature), node);
        }

        for (const param of node.value.params) {
          const tsParam = parserServices.esTreeNodeToTSNodeMap.get(param);
          reportIfBanned(getCachedType(tsParam), param);
        }
      },

      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        const isPublic =
          node.accessibility !== "private" && node.accessibility !== "protected";
        if (!isPublic) return;

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
        reportIfBanned(getCachedType(tsNode), node);
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
        let modParent = tsNode.parent as ts.Node | undefined;
        while (modParent !== undefined && !("modifiers" in modParent)) {
          modParent = modParent.parent as ts.Node | undefined;
        }
        if (modParent === undefined || !("modifiers" in modParent)) return;

        const modifiers = (modParent as ts.HasModifiers).modifiers;
        const isExported = (modifiers ?? []).some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword
        );
        if (!isExported) return;

        let type: ts.Type | undefined;
        if (node.id.type === AST_NODE_TYPES.Identifier && node.id.typeAnnotation) {
          const tsType = parserServices.esTreeNodeToTSNodeMap.get(
            node.id.typeAnnotation.typeAnnotation
          );
          type = checker.getTypeFromTypeNode(tsType as ts.TypeNode);
        } else if (node.init) {
          const tsInit = parserServices.esTreeNodeToTSNodeMap.get(node.init);
          type = getCachedType(tsInit);
        }

        if (type) {
          reportIfBanned(type, node.id);
        }
      },
    };
  },
});
