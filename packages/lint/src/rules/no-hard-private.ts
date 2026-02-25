import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import type { RuleFix } from "@typescript-eslint/utils/ts-eslint";
import { createRule } from "../utils/create-rule";

type ClassMemberWithAccessibility =
  | TSESTree.PropertyDefinition
  | TSESTree.MethodDefinition
  | TSESTree.AccessorProperty;

function isClassMemberWithAccessibility(
  node: TSESTree.Node | undefined,
): node is ClassMemberWithAccessibility {
  return (
    node?.type === AST_NODE_TYPES.PropertyDefinition ||
    node?.type === AST_NODE_TYPES.MethodDefinition ||
    node?.type === AST_NODE_TYPES.AccessorProperty
  );
}

/**
 * ESLint rule that restricts ECMAScript private fields (`#field`) and enforces TypeScript `private` keyword usage.
 *
 * @remarks
 * This rule checks:
 * - Class field declarations: `#field`
 * - Class method declarations: `#method()`
 * - Class accessor declarations: `accessor #field`
 * - Member access expressions: `this.#field`
 */
export default createRule({
  name: "no-hard-private",
  meta: {
    type: "problem",
    docs: {
      description: 'Enforces TypeScript "private _" style instead of hard private fields (#).',
    },
    messages: {
      preferSoftPrivate:
        'Hard private fields (#) are not allowed. Use the "private _" style instead.',
      nameConflict:
        'Cannot convert hard private field "#{{name}}" to "_{{name}}". A member with the same name already exists.',
    },
    fixable: "code",
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    // Stack structure for supporting nested classes
    const classStack: Set<string>[] = [];

    return {
      // 0. Collect member names when entering a class
      "ClassBody"(node: TSESTree.ClassBody) {
        const memberNames = new Set<string>();
        for (const member of node.body) {
          if (!("key" in member)) continue;
          const key = member.key;
          if (key.type === AST_NODE_TYPES.Identifier) {
            memberNames.add(key.name);
          }
        }
        classStack.push(memberNames);
      },

      "ClassBody:exit"() {
        classStack.pop();
      },

      // 1. Detect declarations (PropertyDefinition, MethodDefinition, AccessorProperty)
      "PropertyDefinition > PrivateIdentifier, MethodDefinition > PrivateIdentifier, AccessorProperty > PrivateIdentifier"(
        node: TSESTree.PrivateIdentifier,
      ) {
        const parent = node.parent;
        if (!isClassMemberWithAccessibility(parent)) {
          return;
        }

        const identifierName = node.name; // Name without the '#' character
        const targetName = `_${identifierName}`;
        const currentClassMembers = classStack.at(-1);

        // Check for name conflicts
        if (currentClassMembers?.has(targetName)) {
          context.report({
            node,
            messageId: "nameConflict",
            data: { name: identifierName },
          });
          return;
        }

        context.report({
          node,
          messageId: "preferSoftPrivate",
          fix(fixer) {
            const fixes: RuleFix[] = [];

            // 1-1. Rename (#a -> _a)
            fixes.push(fixer.replaceText(node, targetName));

            // 1-2. Calculate the position to add the 'private' access modifier
            if (parent.accessibility == null) {
              // Default insertion position: beginning of parent node (including static, async, etc)
              let tokenToInsertBefore = sourceCode.getFirstToken(parent);

              // If decorators exist, insert before the token after the last decorator
              // (@Deco private static _foo)
              if (parent.decorators.length > 0) {
                const lastDecorator = parent.decorators.at(-1)!;
                tokenToInsertBefore = sourceCode.getTokenAfter(lastDecorator);
              }

              // tokenToInsertBefore is now 'static', 'async', 'readonly', or a variable name ('_foo').
              // Inserting 'private ' before it naturally results in the correct order 'private static ...'.
              // If tokenToInsertBefore is null, it indicates an exceptional situation such as an AST parsing error.
              // In such cases, skip the entire fix to prevent an incomplete fix that only renames.
              if (tokenToInsertBefore == null) {
                return [];
              }
              fixes.push(fixer.insertTextBefore(tokenToInsertBefore, "private "));
            }

            return fixes;
          },
        });
      },

      // 2. Detect usage (this.#field)
      "MemberExpression > PrivateIdentifier"(node: TSESTree.PrivateIdentifier) {
        const identifierName = node.name;
        context.report({
          node,
          messageId: "preferSoftPrivate",
          fix(fixer) {
            return fixer.replaceText(node, `_${identifierName}`);
          },
        });
      },
    };
  },
});
