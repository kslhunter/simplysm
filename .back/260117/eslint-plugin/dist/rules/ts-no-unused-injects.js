import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
const createRule = ESLintUtils.RuleCreator((name) => `https://github.com/kslhunter/simplysm/blob/master/docs/rules/${name}.md`);
// 간단한 AST 순회 헬퍼
function traverseNode(node, callback) {
    if (!node || typeof node !== "object")
        return;
    callback(node);
    for (const key of Object.keys(node)) {
        if (key === "parent" || key === "loc" || key === "range")
            continue;
        const child = node[key];
        if (Array.isArray(child)) {
            child.forEach((c) => {
                if (c != null && typeof c === "object" && "type" in c && typeof c["type"] === "string") {
                    traverseNode(c, callback);
                }
            });
        }
        else if (child != null && typeof child === "object" && "type" in child && typeof child["type"] === "string") {
            traverseNode(child, callback);
        }
    }
}
export default createRule({
    name: "ts-no-unused-injects",
    meta: {
        type: "problem",
        docs: {
            description: "Disallow unused Angular inject() fields",
        },
        fixable: "code",
        messages: {
            unusedInject: 'inject() field "{{name}}" is never used.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const sourceCode = context.sourceCode;
        return {
            ClassBody(classBody) {
                // inject() 호출로 초기화된 필드 수집
                const injectFields = classBody.body.filter((node) => node.type === "PropertyDefinition" &&
                    node.value?.type === "CallExpression" &&
                    node.value.callee.type === "Identifier" &&
                    node.value.callee.name === "inject" &&
                    node.key.type === "Identifier");
                for (const field of injectFields) {
                    const fieldKey = field.key;
                    const fieldName = fieldKey.name;
                    // 클래스 내 모든 Identifier 중 해당 이름 참조 찾기
                    const allIdentifiers = [];
                    traverseNode(classBody, (node) => {
                        if (node.type === "Identifier" && node.name === fieldName) {
                            allIdentifiers.push(node);
                        }
                    });
                    // 선언부 자신을 제외한 참조가 있는지 확인
                    const references = allIdentifiers.filter((id) => id !== fieldKey);
                    if (references.length === 0) {
                        context.report({
                            node: field,
                            messageId: "unusedInject",
                            data: { name: fieldName },
                            fix(fixer) {
                                // 필드 전체 라인 삭제 (앞뒤 공백/개행 포함)
                                const tokenBefore = sourceCode.getTokenBefore(field);
                                const tokenAfter = sourceCode.getTokenAfter(field);
                                const start = tokenBefore ? tokenBefore.range[1] : field.range[0];
                                const end = tokenAfter ? field.range[1] : field.range[1];
                                return fixer.removeRange([start, end]);
                            },
                        });
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=ts-no-unused-injects.js.map