import { ESLintUtils } from "@typescript-eslint/utils";
const createRule = ESLintUtils.RuleCreator((name) => `https://github.com/kslhunter/simplysm/blob/master/docs/rules/${name}.md`);
export default createRule({
    name: "ng-template-no-todo-comments",
    meta: {
        type: "problem",
        docs: {
            description: "HTML 템플릿 내 TODO 주석을 경고합니다.",
        },
        schema: [],
        messages: {
            noTodo: "{{content}}",
        },
    },
    defaultOptions: [],
    create(context) {
        const sourceCode = context.sourceCode;
        const source = sourceCode.getText();
        const commentRegex = /<!--([\s\S]*?)-->/g;
        let match;
        while ((match = commentRegex.exec(source)) !== null) {
            const commentContent = match[1];
            const todoIndex = commentContent.indexOf("TODO:");
            if (todoIndex < 0)
                continue;
            const start = match.index;
            const end = start + match[0].length;
            const content = commentContent.slice(todoIndex + 5).trim();
            const loc = sourceCode.getLocFromIndex(start);
            const endLoc = sourceCode.getLocFromIndex(end);
            context.report({
                loc: { start: loc, end: endLoc },
                messageId: "noTodo",
                data: { content },
            });
        }
        return {};
    },
});
//# sourceMappingURL=ng-template-no-todo-comments.js.map