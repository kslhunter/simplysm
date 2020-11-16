module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "'TODO' 주석 경고"
    },

    schema: []
  },

  create: (context) => {
    const parserServices = context.parserServices;
    return parserServices.defineTemplateBodyVisitor({
      Program(node) {
        if (node.value) {
          const comments = node.value.match(/<!--(((?!-->)[\s\S])*)-->/g);
          if (!comments) return;

          let cursor = 0;
          for (const comment of comments) {
            if (!comment.includes("TODO:")) continue;

            const index = node.value.slice(cursor).indexOf(comment) + cursor;
            const line = node.value.slice(0, index).split("\n").length;
            const column = index - node.value.slice(0, index).lastIndexOf("\n") - 1;

            const endIndex = index + comment.length;
            const endLine = node.value.slice(0, endIndex).split("\n").length;
            const endColumn = endIndex - node.value.slice(0, endIndex).lastIndexOf("\n") - 1;

            cursor += index;

            context.report({
              loc: {
                start: { line, column },
                end: { line: endLine, column: endColumn }
              },
              message: comment.match(/<!--(((?!-->)[\s\S])*)-->/)[1].trim()
            });
          }
        }
      }
    });
  }
};
