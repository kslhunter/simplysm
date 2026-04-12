import { describe, it, expect } from "vitest";
import path from "path";
import ts from "typescript";
import { AngularCompiler, AngularSourceFileCache } from "../../src/angular/angular-compiler.js";
import { AngularBuildPipeline } from "../../src/angular/angular-build-pipeline.js";
import { getPackageSourceFiles } from "../../src/utils/tsconfig.js";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "fixtures/packages/basic-app");
const TSCONFIG_PATH = path.join(FIXTURE_DIR, "tsconfig.json");

function loadTsConfig(): { rootNames: string[]; compilerOptions: ts.CompilerOptions } {
  const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, FIXTURE_DIR);
  return { rootNames: parsed.fileNames, compilerOptions: parsed.options };
}

describe("AngularCompiler — HMR 코드 제거", () => {
  // initialize() 반환 객체에 templateUpdates 키가 없다
  it("initialize result has no templateUpdates property", async () => {
    const { rootNames, compilerOptions } = loadTsConfig();
    const compiler = new AngularCompiler({
      rootNames,
      compilerOptions,
      compilerOptionsTransformer: (opts) => ({ ...opts, noEmit: false, declaration: false }),
    });

    const result = await compiler.initialize();
    expect(Object.keys(result)).toEqual(["affectedFiles"]);
  });

});

describe("AngularBuildPipeline — HMR 전파 제거", () => {
  function createPipelineOptions() {
    const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, FIXTURE_DIR);
    const rootNames = getPackageSourceFiles(FIXTURE_DIR, parsed);
    return {
      mode: "library" as const,
      pkgDir: FIXTURE_DIR,
      cwd: FIXTURE_DIR,
      rootNames,
      compilerOptions: {
        ...parsed.options,
        noEmit: false,
        declaration: false,
        declarationMap: false,
      },
      angularCompilerOptions: parsed.raw?.angularCompilerOptions as
        | Record<string, unknown>
        | undefined,
    };
  }

  // PipelineResult에 templateUpdates가 없다
  it("pipeline result has no templateUpdates property", async () => {
    const pipeline = new AngularBuildPipeline(createPipelineOptions());
    const result = await pipeline.initialize();

    expect("templateUpdates" in result).toBe(false);
    expect(result.affectedFiles).toBeDefined();
    expect(result.diagnostics).toBeDefined();
    expect(result.scssErrors).toBeDefined();
  });

  // pipeline update 결과에도 templateUpdates가 없다
  it("pipeline update result has no templateUpdates property", async () => {
    const pipeline = new AngularBuildPipeline({
      ...createPipelineOptions(),
      sourceFileCache: new AngularSourceFileCache(),
    });
    await pipeline.initialize();

    const appPath = path.join(FIXTURE_DIR, "src/app.component.ts").replace(/\\/g, "/");
    const updateResult = await pipeline.update([appPath]);

    expect("templateUpdates" in updateResult).toBe(false);
    expect(updateResult.affectedFiles).toBeDefined();
  });
});
