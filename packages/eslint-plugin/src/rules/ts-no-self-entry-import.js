const resolve = require("eslint-module-utils/resolve").default;
const path = require("path");

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "동일 패키지 내의 index.ts 파일 import 금지"
    },

    schema: []
  },
  create: (context) => {
    const filePath = context.getFilename();
    const importMap = new Map();

    function append(requirePath, node) {
      if (filePath !== "<text>" && (requirePath.endsWith(".") || requirePath.endsWith("/"))) {
        const resolvedPath = (resolve(requirePath, context) || requirePath).toLowerCase();
        if (resolvedPath) {
          if (importMap.has(resolvedPath)) {
            importMap.get(resolvedPath).push(node);
          }
          else {
            importMap.set(resolvedPath, [node]);
          }
        }
      }
    }

    return {
      "ImportDeclaration": (node) => {
        append(node.source.value, node);
      },
      "CallExpression": (node) => {
        if (
          node &&
          node.callee &&
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length === 1 &&
          node.arguments[0].type === "Literal" &&
          typeof node.arguments[0].value === "string"
        ) {
          append(node.arguments[0].value, node);
        }
      },
      "Program:exit": () => {
        const rootFileNames = context.parserServices.program.getRootFileNames()
          .map((item) => path.normalize(item).toLowerCase());
        for (const rootFileName of rootFileNames) {
          if (importMap.has(rootFileName)) {
            for (const node of importMap.get(rootFileName)) {
              context.report({
                node,
                message: "동일 패키지상의 index.ts 파일을 import 하고 있습니다."
              });
            }
          }
        }
      }
    };
  }
};