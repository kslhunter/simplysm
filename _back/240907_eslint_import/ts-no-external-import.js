import path from "path";
import fs from "fs";
import { default as _resolve } from "eslint-module-utils/resolve";

export default {
  meta: {
    type: "problem",
    docs: {
      description: "패키지 외부의 파일 직접 import 금지",
    },
    fixable: "code",
    schema: [],
  },
  create: (context) => {
    const filePath = context.filename;

    function getPkgPath(currFilePath) {
      let curr = path.dirname(currFilePath);
      while (true) {
        if (fs.existsSync(path.resolve(curr, "package.json"))) {
          break;
        }

        curr = path.dirname(curr);
        if (!curr) break;
      }

      return curr;
    }

    function append(node) {
      const requirePath = node.value;
      if (filePath !== "<text>" && requirePath.startsWith("..")) {
        const resolvedPath = (_resolve.default(requirePath, context) || requirePath).toLowerCase();
        if (resolvedPath) {
          const pkgPath = getPkgPath(filePath);
          const relativePath = path.relative(pkgPath, resolvedPath);
          const isChildPath = Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
          if (!isChildPath) {
            context.report({
              node,
              message: "패키지 외부의 파일을 직접 import 하고 있습니다.",
              fix(fixer) {
                const reqPkgNpmConf = JSON.parse(
                  fs.readFileSync(path.resolve(getPkgPath(resolvedPath), "package.json"), "utf-8"),
                );
                return fixer.replaceText(node, `"${reqPkgNpmConf.name}"`);
              },
            });
          }
        }
      }
    }

    return {
      ImportDeclaration: (node) => {
        append(node.source);
      },
      CallExpression: (node) => {
        if (
          node &&
          node.callee &&
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length === 1 &&
          node.arguments[0].type === "Literal" &&
          typeof node.arguments[0].value === "string"
        ) {
          append(node.arguments[0]);
        }
      },
    };
  },
};
