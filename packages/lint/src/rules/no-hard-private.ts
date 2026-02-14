import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import type { RuleFix } from "@typescript-eslint/utils/ts-eslint";
import { createRule } from "../utils/create-rule";

type ClassMemberWithAccessibility = TSESTree.PropertyDefinition | TSESTree.MethodDefinition | TSESTree.AccessorProperty;

function isClassMemberWithAccessibility(node: TSESTree.Node | undefined): node is ClassMemberWithAccessibility {
  return (
    node?.type === AST_NODE_TYPES.PropertyDefinition ||
    node?.type === AST_NODE_TYPES.MethodDefinition ||
    node?.type === AST_NODE_TYPES.AccessorProperty
  );
}

/**
 * ECMAScript private 필드(`#field`) 사용을 제한하고 TypeScript `private` 키워드 사용을 강제하는 ESLint 규칙
 *
 * @remarks
 * 이 규칙은 다음을 검사한다:
 * - 클래스 필드 선언: `#field`
 * - 클래스 메서드 선언: `#method()`
 * - 클래스 접근자 선언: `accessor #field`
 * - 멤버 접근 표현식: `this.#field`
 */
export default createRule({
  name: "no-hard-private",
  meta: {
    type: "problem",
    docs: {
      description: '하드 프라이빗 필드(#) 대신 TypeScript "private _" 스타일을 강제한다.',
    },
    messages: {
      preferSoftPrivate: '하드 프라이빗 필드(#)는 허용되지 않습니다. "private _" 스타일을 사용하세요.',
      nameConflict:
        '하드 프라이빗 필드 "#{{name}}"을 "_{{name}}"으로 변환할 수 없습니다. 동일한 이름의 멤버가 이미 존재합니다.',
    },
    fixable: "code",
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    // 중첩 클래스 지원을 위한 스택 구조
    const classStack: Set<string>[] = [];

    return {
      // 0. 클래스 진입 시 멤버 이름 수집
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

      // 1. 선언부 감지 (PropertyDefinition, MethodDefinition, AccessorProperty)
      "PropertyDefinition > PrivateIdentifier, MethodDefinition > PrivateIdentifier, AccessorProperty > PrivateIdentifier"(
        node: TSESTree.PrivateIdentifier,
      ) {
        const parent = node.parent;
        if (!isClassMemberWithAccessibility(parent)) {
          return;
        }

        const identifierName = node.name; // '#'을 제외한 이름
        const targetName = `_${identifierName}`;
        const currentClassMembers = classStack.at(-1);

        // 이름 충돌 검사
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

            // 1-1. 이름 변경 (#a -> _a)
            fixes.push(fixer.replaceText(node, targetName));

            // 1-2. 'private' 접근 제어자 추가 위치 계산
            if (parent.accessibility == null) {
              // 기본 삽입 위치: 부모 노드의 시작 지점 (static, async 등 포함)
              let tokenToInsertBefore = sourceCode.getFirstToken(parent);

              // 데코레이터가 있다면, 마지막 데코레이터 '다음' 토큰 앞에 삽입
              // (@Deco private static _foo)
              if (parent.decorators.length > 0) {
                const lastDecorator = parent.decorators.at(-1)!;
                tokenToInsertBefore = sourceCode.getTokenAfter(lastDecorator);
              }

              // tokenToInsertBefore는 이제 'static', 'async', 'readonly' 또는 변수명('_foo')입니다.
              // 이 앞에 'private '를 붙이면 자연스럽게 'private static ...' 순서가 됩니다.
              // tokenToInsertBefore가 null인 경우는 AST 파싱 오류 등 예외 상황이므로,
              // 이름만 변경되는 불완전한 fix를 방지하기 위해 전체 fix를 생략한다.
              if (tokenToInsertBefore == null) {
                return [];
              }
              fixes.push(fixer.insertTextBefore(tokenToInsertBefore, "private "));
            }

            return fixes;
          },
        });
      },

      // 2. 사용부 감지 (this.#field)
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
