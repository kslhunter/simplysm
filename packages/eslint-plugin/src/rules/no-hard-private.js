export default {
  meta: {
    type: "problem",
    docs: {
      description: 'Enforce TypeScript "private _" style over ECMAScript "#" private fields.',
    },
    messages: {
      preferSoftPrivate: 'Hard private fields (#) are not allowed. Use "private _" instead.',
    },
    fixable: "code",
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode; // 소스 코드 접근 객체

    return {
      // 1. 선언부 감지
      "PropertyDefinition > PrivateIdentifier, MethodDefinition > PrivateIdentifier"(node) {
        const parent = node.parent;
        const identifierName = node.name; // '#'을 제외한 이름

        context.report({
          node: node,
          messageId: "preferSoftPrivate",
          fix(fixer) {
            const fixes = [];

            // 1-1. 이름 변경 (#a -> _a)
            fixes.push(fixer.replaceText(node, `_${identifierName}`));

            // 1-2. 'private' 접근 제어자 추가 위치 계산
            if (!parent.accessibility) {
              // 기본 삽입 위치: 부모 노드의 시작 지점 (static, async 등 포함)
              let tokenToInsertBefore = sourceCode.getFirstToken(parent);

              // 데코레이터가 있다면, 마지막 데코레이터 '다음' 토큰 앞에 삽입
              // (@Deco private static _foo)
              if (parent.decorators && parent.decorators.length > 0) {
                const lastDecorator = parent.decorators[parent.decorators.length - 1];
                tokenToInsertBefore = sourceCode.getTokenAfter(lastDecorator);
              }

              // tokenToInsertBefore는 이제 'static', 'async', 'readonly' 또는 변수명('_foo')입니다.
              // 이 앞에 'private '를 붙이면 자연스럽게 'private static ...' 순서가 됩니다.
              fixes.push(fixer.insertTextBefore(tokenToInsertBefore, "private "));
            }

            return fixes;
          },
        });
      },

      // 2. 사용부 감지 (this.#field) - 변경 없음
      "MemberExpression > PrivateIdentifier"(node) {
        const identifierName = node.name;
        context.report({
          node: node,
          messageId: "preferSoftPrivate",
          fix(fixer) {
            return fixer.replaceText(node, `_${identifierName}`);
          },
        });
      },
    };
  },
};