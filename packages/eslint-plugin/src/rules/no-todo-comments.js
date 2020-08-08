"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "'TODO' 주석 경고"
    },

    schema: []
  },

  create: context => {
    const sourceCode = context.getSourceCode();

    return {
      Program() {
        const commentNodes = sourceCode.getAllComments();

        for (const commentNode of commentNodes) {
          if ((/^\s*TODO.*/i).test(commentNode.value)) {
            context.report({
              node: commentNode,
              message: commentNode.value
            });
          }
        }
      }
    };
  }
};
