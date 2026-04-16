import { createRule } from "../utils/create-rule";

/**
 * HTML 템플릿 내 TODO 주석을 감지하여 경고하는 ESLint 규칙.
 *
 * @remarks
 * `<!-- TODO: ... -->` 형태의 HTML 주석을 찾아 보고합니다.
 * raw text regex 방식으로 동작하므로 AST 노드 방문자가 아닌 빈 객체를 반환합니다.
 */
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
    while ((match = commentRegex.exec(source)) != null) {
      const commentContent = match[1];
      const todoIndex = commentContent.indexOf("TODO:");
      if (todoIndex < 0) continue;

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
