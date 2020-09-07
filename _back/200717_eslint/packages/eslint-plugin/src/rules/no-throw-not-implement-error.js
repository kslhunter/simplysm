"use strict";

// TODO: JS 파일에도 같은 기능을 할 수 잇을텐데..

const { AST_NODE_TYPES } = require("@typescript-eslint/experimental-utils");

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "'NotImplementError' 사용 경고",
      recommended: true
    },

    schema: []
  },
  create: context => {
    const parserServices = context.parserServices;
    const program = parserServices.program;
    const checker = program.getTypeChecker();

    function tryGetThrowArgumentType(node) {
      switch (node.type) {
        case AST_NODE_TYPES.Identifier:
        case AST_NODE_TYPES.CallExpression:
        case AST_NODE_TYPES.NewExpression:
        case AST_NODE_TYPES.MemberExpression: {
          const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
          return checker.getTypeAtLocation(tsNode);
        }

        case AST_NODE_TYPES.AssignmentExpression:
          return tryGetThrowArgumentType(node.right);

        case AST_NODE_TYPES.SequenceExpression:
          return tryGetThrowArgumentType(node.expressions[node.expressions.length - 1]);

        case AST_NODE_TYPES.LogicalExpression: {
          const left = tryGetThrowArgumentType(node.left);
          return left === undefined ? tryGetThrowArgumentType(node.right) : left;
        }

        case AST_NODE_TYPES.ConditionalExpression: {
          const consequent = tryGetThrowArgumentType(node.consequent);
          return consequent === undefined ? tryGetThrowArgumentType(node.alternate) : consequent;
        }

        default:
          return null;
      }
    }

    function checkThrowArgument(node) {
      if (node.type === AST_NODE_TYPES.AwaitExpression || node.type === AST_NODE_TYPES.YieldExpression) {
        return;
      }

      const type = tryGetThrowArgumentType(node);
      if (type && type.getSymbol() && type.getSymbol().getName() === "NotImplementError") {
        context.report({
          node,
          message: "'NotImplementError'를 'throw'하고 있습니다."
        });
      }
    }

    return {
      ThrowStatement(node) {
        if (node.argument) {
          checkThrowArgument(node.argument);
        }
      }
    };
  }
};
