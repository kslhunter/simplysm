"use strict";

const resolve = require("eslint-module-utils/resolve").default;

const isImportingSelfEntry = function (context, node, requireName) {
  const filePath = context.getFilename();

  if (context.parserServices && context.parserServices.program) {
    const rootFileNames = context.parserServices.program.getRootFileNames();

    if (resolve(requireName, context)) {
      const requireFilePath = resolve(requireName, context).replace(/\\/g, "/").toLowerCase();
      const rootFilePaths = rootFileNames.map(item => item.replace(/\\/g, "/").toLowerCase());

      if (
        (requireName.endsWith(".") || requireName.endsWith("/")) &&
        filePath !== "<text>" &&
        rootFilePaths.includes(requireFilePath)
      ) {
        context.report({
          node,
          message: "동일 패키지상의 index.ts 파일을 import 하고 있습니다."
        });
      }
    }
  }
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "동일 패키지 내의 index.ts 파일 import 금지",
      recommended: true
    },

    schema: []
  },
  create: context => ({
    ImportDeclaration: node => {
      isImportingSelfEntry(context, node, node.source.value);
    },
    CallExpression: node => {
      if (node &&
        node.callee &&
        node.callee.type === "Identifier" &&
        node.callee.name === "require" &&
        node.arguments.length === 1 &&
        node.arguments[0].type === "Literal" &&
        typeof node.arguments[0].value === "string") {
        isImportingSelfEntry(context, node, node.arguments[0].value);
      }
    }
  })
};