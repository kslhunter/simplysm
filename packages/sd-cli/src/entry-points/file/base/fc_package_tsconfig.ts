export const fc_package_tsconfig = (opt: { isModule: boolean; useDom: boolean }): string => JSON.stringify({
  extends: "../../tsconfig.json",
  compilerOptions: {
    ...!opt.isModule ? { module: "CommonJS" } : {},
    lib: [
      "ES2020",
      ...opt.useDom ? ["DOM"] : []
    ],
    outDir: "./dist"
  }
}, undefined, 2);
