export default {
  meta: {
    type: "problem",
    docs: {
      description: "HTML 템플릿내 TODO 주석을 경고합니다.",
    },
    schema: [],
    messages: {
      noTodo: "Unexpected TODO comment in HTML template: '{{content}}'",
    },
  },

  create(context) {
    const source = context.getSourceCode().getText();

    const commentRegex = /<!--[\s\S]*?-->/g;
    let match;

    while ((match = commentRegex.exec(source)) !== null) {
      const comment = match[0];
      if (!comment.includes("TODO:")) continue;

      const start = match.index;
      const end = start + comment.length;

      const contentMatch = comment.match(/<!--([\s\S]*?)-->/);
      let content = contentMatch ? contentMatch[1].trim() : "";
      const todoIndex = content.indexOf("TODO:");
      if (todoIndex !== -1) {
        content = content.substring(todoIndex + 5).trim();
      }

      const loc = context.getSourceCode().getLocFromIndex(start);
      const endLoc = context.getSourceCode().getLocFromIndex(end);

      context.report({
        loc: { start: loc, end: endLoc },
        messageId: "noTodo",
        data: {
          content: content,
        },
      });
    }

    return {};
  },
};