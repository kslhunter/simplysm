import ts from "typescript";
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/createRule";
import { createTypeCacheHelper } from "../utils/typeChecker";

const TYPED_ARRAY_NAMES = new Set([
  "Uint8Array",
  "Uint8ClampedArray",
  "Int8Array",
  "Uint16Array",
  "Int16Array",
  "Uint32Array",
  "Int32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array",
]);

export default createRule({
  name: "ts-no-buffer-in-typedarray-context",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Buffer being used directly in TypedArray contexts. Use new TypedArray(buffer) instead.",
    },
    messages: {
      directBuffer:
        "Do not use Buffer directly where {{expected}} is expected. Use new {{expected}}(buffer) instead.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();
    const { getCachedType } = createTypeCacheHelper(checker);

    function getTypeName(type: ts.Type): string | undefined {
      const symbol = type.getSymbol();
      return symbol ? symbol.getName() : undefined;
    }

    function isBuffer(type: ts.Type): boolean {
      return getTypeName(type) === "Buffer";
    }

    function isTypedArray(type: ts.Type): boolean {
      const name = getTypeName(type);
      return name !== undefined && TYPED_ARRAY_NAMES.has(name);
    }

    function isInsideBufferStaticCall(tsNode: ts.Node): boolean {
      let current = tsNode.parent as ts.Node | undefined;
      while (current !== undefined) {
        if (
          current.kind === ts.SyntaxKind.CallExpression &&
          (current as ts.CallExpression).expression.kind === ts.SyntaxKind.PropertyAccessExpression
        ) {
          const expr = (current as ts.CallExpression).expression as ts.PropertyAccessExpression;
          if (
            expr.expression.kind === ts.SyntaxKind.Identifier &&
            (expr.expression as ts.Identifier).escapedText === "Buffer"
          ) {
            return true;
          }
        }
        current = current.parent;
      }
      return false;
    }

    function reportIfInvalid(node: TSESTree.Node, expectedType: ts.Type): void {
      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
      const actualType = getCachedType(tsNode);

      // 예외: Buffer.~~~ 함수 호출 내의 인자는 검사 대상에서 제외
      if (isInsideBufferStaticCall(tsNode)) return;

      if (!isBuffer(actualType)) return;
      if (!isTypedArray(expectedType)) return;

      context.report({
        node,
        messageId: "directBuffer",
        data: {
          expected: getTypeName(expectedType) ?? "TypedArray",
        },
      });
    }

    function checkTypedAssignment(lhsNode: TSESTree.Node, rhsNode: TSESTree.Node): void {
      if (lhsNode.type !== AST_NODE_TYPES.Identifier) return;

      const lhsTsNode = parserServices.esTreeNodeToTSNodeMap.get(lhsNode);
      const expectedType = getCachedType(lhsTsNode);

      reportIfInvalid(rhsNode, expectedType);
    }

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.init != null) {
          checkTypedAssignment(node.id, node.init);
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        checkTypedAssignment(node.left, node.right);
      },

      ReturnStatement(node: TSESTree.ReturnStatement) {
        if (!node.argument) return;
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.argument);
        const contextualType = checker.getContextualType(tsNode as ts.Expression);
        if (contextualType) {
          reportIfInvalid(node.argument, contextualType);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
        const signature = checker.getResolvedSignature(tsNode);
        if (signature == null) return;

        const params = signature.getParameters();
        node.arguments.forEach((arg, index) => {
          const param = params[index] as ts.Symbol | undefined;
          if (param === undefined) return;

          const paramType = checker.getTypeOfSymbolAtLocation(param, tsNode);
          reportIfInvalid(arg, paramType);
        });
      },

      Property(node: TSESTree.Property) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.value as TSESTree.Node);
        const contextualType = checker.getContextualType(tsNode as ts.Expression);
        if (contextualType) {
          reportIfInvalid(node.value as TSESTree.Node, contextualType);
        }
      },

      ArrayExpression(node: TSESTree.ArrayExpression) {
        node.elements.forEach((el) => {
          if (el && el.type !== AST_NODE_TYPES.SpreadElement) {
            const tsNode = parserServices.esTreeNodeToTSNodeMap.get(el);
            const contextualType = checker.getContextualType(tsNode as ts.Expression);
            if (contextualType) {
              reportIfInvalid(el, contextualType);
            }
          }
        });
      },

      ConditionalExpression(node: TSESTree.ConditionalExpression) {
        const thenTsNode = parserServices.esTreeNodeToTSNodeMap.get(node.consequent);
        const elseTsNode = parserServices.esTreeNodeToTSNodeMap.get(node.alternate);
        const thenType = checker.getContextualType(thenTsNode as ts.Expression);
        const elseType = checker.getContextualType(elseTsNode as ts.Expression);

        if (thenType) reportIfInvalid(node.consequent, thenType);
        if (elseType) reportIfInvalid(node.alternate, elseType);
      },
    };
  },
});
