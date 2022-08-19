export const fc_project_tsconfig = (): string => JSON.stringify({
  compilerOptions: {
    declaration: true,
    downlevelIteration: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    module: "ES2020",
    target: "ES2020",
    strict: true,
    moduleResolution: "node",
    esModuleInterop: true,
    noImplicitReturns: true,
    noImplicitAny: false,
    useUnknownInCatchVariables: false,
    noFallthroughCasesInSwitch: true,
    sourceMap: true,
    skipDefaultLibCheck: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    noPropertyAccessFromIndexSignature: true,
    importHelpers: true,
    noUnusedLocals: true
  }
}, undefined, 2);
