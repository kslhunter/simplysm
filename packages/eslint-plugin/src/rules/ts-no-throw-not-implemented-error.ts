import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import type ts from "typescript";
import { createRule } from "../utils/create-rule";

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
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();

    const tryGetThrowArgumentType = (node: TSESTree.Node): ts.Type | undefined => {
      switch (node.type) {
        case AST_NODE_TYPES.Identifier:
        case AST_NODE_TYPES.CallExpression:
        case AST_NODE_TYPES.NewExpression:
        case AST_NODE_TYPES.MemberExpression:
          return checker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(node));

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
          return undefined;
      }
    };

    /**
     * throw 문의 인자가 NotImplementedError인지 검사하고 경고를 보고합니다.
     * @remarks await/yield 표현식은 런타임에 결과가 결정되므로 정적 분석에서 제외됩니다.
     */
    const checkThrowArgument = (node: TSESTree.Node | null): void => {
      if (!node) return;

      if (
        node.type === AST_NODE_TYPES.AwaitExpression ||
        node.type === AST_NODE_TYPES.YieldExpression
      ) {
        return;
      }

      const type = tryGetThrowArgumentType(node);
      if (type?.getSymbol()?.getName() === "NotImplementedError") {
        let msg: string | undefined;

        if (
          node.type === AST_NODE_TYPES.NewExpression &&
          node.arguments[0]?.type === AST_NODE_TYPES.Literal
        ) {
          msg = String(node.arguments[0].value ?? "");
        }

        context.report({
          node,
          messageId: "noThrowNotImplementedError",
          data: { text: msg ?? "구현되어있지 않습니다" },
        });
      }
    };

    return {
      ThrowStatement(node: TSESTree.ThrowStatement) {
        checkThrowArgument(node.argument);
      },
    };
  },
});
