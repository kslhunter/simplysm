import { describe, it, expect, afterEach } from "vitest";
import path from "path";
import ts from "typescript";
import { AngularCompiler, AngularSourceFileCache } from "../../src/angular/angular-compiler.js";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "fixtures/packages/basic-app");
const TSCONFIG_PATH = path.join(FIXTURE_DIR, "tsconfig.json");
const APP_COMPONENT_PATH = path.join(FIXTURE_DIR, "src/app.component.ts").replace(/\\/g, "/");

function loadTsConfig(): { rootNames: string[]; compilerOptions: ts.CompilerOptions } {
  const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, FIXTURE_DIR);
  return { rootNames: parsed.fileNames, compilerOptions: parsed.options };
}

describe("AngularCompiler AOT (HMR dead code 제거 후)", () => {
  let compiler: AngularCompiler | undefined;

  afterEach(() => {
    compiler = undefined;
  });

  // Scenario: initialize() 반환에 templateUpdates가 없음
  // Scenario: enableHmr 없이 pipeline.initialize()를 호출하면 AOT 컴파일이 정상 완료된다
  it("initialize returns affectedFiles without templateUpdates", async () => {
    const { rootNames, compilerOptions } = loadTsConfig();

    compiler = new AngularCompiler({
      rootNames,
      compilerOptions,
      compilerOptionsTransformer: (opts) => ({ ...opts, noEmit: false, declaration: false }),
    });

    const result = await compiler.initialize();

    // affectedFiles가 반환된다
    expect(result.affectedFiles).toBeDefined();
    expect(result.affectedFiles.size).toBeGreaterThan(0);

    // templateUpdates가 반환 객체에 존재하지 않는다
    expect("templateUpdates" in result).toBe(false);
  });

  // Scenario: update() 반환에 templateUpdates가 없음
  // Scenario: 증분 재컴파일 정상 동작
  it("update returns affectedFiles without templateUpdates", async () => {
    const { rootNames, compilerOptions } = loadTsConfig();
    const sourceFileCache = new AngularSourceFileCache();

    compiler = new AngularCompiler({
      rootNames,
      compilerOptions,
      sourceFileCache,
      compilerOptionsTransformer: (opts) => ({ ...opts, noEmit: false, declaration: false }),
    });

    await compiler.initialize();

    // 파일 변경 후 update() 호출
    const updateResult = await compiler.update([APP_COMPONENT_PATH]);

    // affectedFiles가 반환된다
    expect(updateResult.affectedFiles).toBeDefined();

    // templateUpdates가 반환 객체에 존재하지 않는다
    expect("templateUpdates" in updateResult).toBe(false);
  });
});
