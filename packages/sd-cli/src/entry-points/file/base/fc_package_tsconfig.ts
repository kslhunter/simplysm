export const fc_package_tsconfig = (opt: { isModule: boolean; useDom: boolean; options: Record<string, any> }): string => JSON.stringify({
  extends: "../../tsconfig.json",
  compilerOptions: {
    ...!opt.isModule ? { module: "CommonJS" } : {},
    lib: [
      "ES2020",
      ...opt.useDom ? ["DOM"] : []
    ],
    outDir: "./dist"
  },
  ...opt.options
}, undefined, 2);
