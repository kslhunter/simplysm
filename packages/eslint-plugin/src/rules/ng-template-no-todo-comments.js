export default {
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

  create(context) {
    const source = context.getSourceCode().getText();
    const commentRegex = /<!--([\s\S]*?)-->/g;
    let match;

    while ((match = commentRegex.exec(source)) !== null) {
      const commentContent = match[1];
      const todoIndex = commentContent.indexOf("TODO:");
      if (todoIndex < 0) continue;

      const start = match.index;
      const end = start + match[0].length;
      const content = commentContent
        .slice(todoIndex + 5)
        .trim();

      const loc = context.getSourceCode().getLocFromIndex(start);
      const endLoc = context.getSourceCode().getLocFromIndex(end);

      context.report({
        loc: { start: loc, end: endLoc },
        messageId: "noTodo",
        data: { content },
      });
    }

    return {};
  },
};