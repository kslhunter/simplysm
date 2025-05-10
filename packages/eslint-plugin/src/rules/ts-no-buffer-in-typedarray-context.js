import ts from "typescript";
import { ESLintUtils } from '@typescript-eslint/utils';

const TYPED_ARRAY_NAMES = new Set([
  'Uint8Array', 'Uint8ClampedArray',
  'Int8Array', 'Uint16Array', 'Int16Array',
  'Uint32Array', 'Int32Array',
  'Float32Array', 'Float64Array',
]);

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow Buffer being used directly in TypedArray contexts. Use new TypedArray(buffer) instead.',
      recommended: 'error',
    },
    messages: {
      directBuffer: 'Do not use Buffer directly where {{expected}} is expected. Use new {{expected}}(buffer) instead.',
    },
    schema: [],
  },

  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();
    const typeCache = new WeakMap();

    function getCachedType(tsNode) {
      if (typeCache.has(tsNode)) return typeCache.get(tsNode);
      const type = checker.getTypeAtLocation(tsNode);
      typeCache.set(tsNode, type);
      return type;
    }

    function getTypeName(type) {
      const symbol = type.getSymbol();
      return symbol ? symbol.getName() : undefined;
    }

    function isBuffer(type) {
      return getTypeName(type) === 'Buffer';
    }

    function isTypedArray(type) {
      const name = getTypeName(type);
      return name && TYPED_ARRAY_NAMES.has(name);
    }

    function isInsideBufferStaticCall(tsNode) {
      let current = tsNode.parent;
      while (current) {
        if (
          current.kind === ts.SyntaxKind.CallExpression &&
          current.expression.kind === ts.SyntaxKind.PropertyAccessExpression
        ) {
          const expr = current.expression;
          if (
            expr.expression.kind === ts.SyntaxKind.Identifier &&
            expr.expression.escapedText === 'Buffer'
          ) {
            return true;
          }
        }
        current = current.parent;
      }
      return false;
    }

    function reportIfInvalid(node, expectedType) {
      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
      const actualType = getCachedType(tsNode);

      // 예외: Buffer.~~~ 함수 호출 내의 인자는 검사 대상에서 제외
      if (isInsideBufferStaticCall(tsNode)) return;

      if (!isBuffer(actualType)) return;
      if (!isTypedArray(expectedType)) return;

      context.report({
        node,
        messageId: 'directBuffer',
        data: {
          expected: getTypeName(expectedType) || 'TypedArray',
        },
      });
    }

    function checkTypedAssignment(lhsNode, rhsNode) {
      if (lhsNode.type !== 'Identifier') return;

      const lhsTsNode = parserServices.esTreeNodeToTSNodeMap.get(lhsNode);
      const expectedType = getCachedType(lhsTsNode);

      reportIfInvalid(rhsNode, expectedType);
    }

    return {
      VariableDeclarator(node) {
        if (node.init && node.id) {
          checkTypedAssignment(node.id, node.init);
        }
      },

      AssignmentExpression(node) {
        checkTypedAssignment(node.left, node.right);
      },

      ReturnStatement(node) {
        if (!node.argument) return;
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.argument);
        const contextualType = checker.getContextualType(tsNode);
        if (contextualType) {
          reportIfInvalid(node.argument, contextualType);
        }
      },

      CallExpression(node) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
        const signature = checker.getResolvedSignature(tsNode);
        if (!signature) return;

        const params = signature.getParameters();
        node.arguments.forEach((arg, index) => {
          const param = params[index];
          if (!param) return;

          const paramType = checker.getTypeOfSymbolAtLocation(param, tsNode);
          reportIfInvalid(arg, paramType);
        });
      },

      Property(node) {
        if (!node.value) return;
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.value);
        const contextualType = checker.getContextualType(tsNode);
        if (contextualType) {
          reportIfInvalid(node.value, contextualType);
        }
      },

      ArrayExpression(node) {
        node.elements.forEach(el => {
          if (el && el.type !== 'SpreadElement') {
            const tsNode = parserServices.esTreeNodeToTSNodeMap.get(el);
            const contextualType = checker.getContextualType(tsNode);
            if (contextualType) {
              reportIfInvalid(el, contextualType);
            }
          }
        });
      },

      ConditionalExpression(node) {
        const thenTsNode = parserServices.esTreeNodeToTSNodeMap.get(node.consequent);
        const elseTsNode = parserServices.esTreeNodeToTSNodeMap.get(node.alternate);
        const thenType = checker.getContextualType(thenTsNode);
        const elseType = checker.getContextualType(elseTsNode);

        if (thenType) reportIfInvalid(node.consequent, thenType);
        if (elseType) reportIfInvalid(node.alternate, elseType);
      },
    };
  },
};
