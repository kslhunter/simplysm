import { ESLintUtils } from "@typescript-eslint/utils";
const createRule = ESLintUtils.RuleCreator((name) => `https://github.com/kslhunter/simplysm/blob/master/docs/rules/${name}.md`);
export default createRule({
    name: "no-subpath-imports-from-simplysm",
    meta: {
        type: "problem",
        docs: {
            description: "@simplysm 패키지에서 'src' 서브경로 import를 금지합니다. (ex: @simplysm/pkg/src/x → 금지)",
        },
        schema: [],
        messages: {
            noSubpathImport: "'@simplysm/{{pkg}}' 패키지는 'src' 서브경로를 import할 수 없습니다. import '{{importPath}}'는 허용되지 않습니다.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            ImportDeclaration(node) {
                const importPath = node.source.value;
                if (typeof importPath !== "string")
                    return;
                if (importPath.startsWith("@simplysm/")) {
                    const parts = importPath.split("/");
                    // 허용: @simplysm/pkg, @simplysm/pkg/xxx, @simplysm/pkg/xxx/yyy
                    // 금지: @simplysm/pkg/src, @simplysm/pkg/src/xxx
                    if (parts.length >= 3 && parts[2] === "src") {
                        context.report({
                            node: node.source,
                            messageId: "noSubpathImport",
                            data: {
                                pkg: parts[1],
                                importPath,
                            },
                        });
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=no-subpath-imports-from-simplysm.js.map