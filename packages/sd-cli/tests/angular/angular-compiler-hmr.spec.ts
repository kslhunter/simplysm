import { describe, it, expect, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import { AngularCompiler, AngularSourceFileCache } from "../../src/utils/angular-compiler.js";
import ts from "typescript";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "fixtures/packages/basic-app");
const TSCONFIG_PATH = path.join(FIXTURE_DIR, "tsconfig.json");
const APP_COMPONENT_PATH = path.join(FIXTURE_DIR, "src/app.component.ts").replace(/\\/g, "/");

function loadTsConfig(): { rootNames: string[]; compilerOptions: ts.CompilerOptions } {
  const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, FIXTURE_DIR);
  return { rootNames: parsed.fileNames, compilerOptions: parsed.options };
}

describe("AngularCompiler HMR", () => {
  let compiler: AngularCompiler | undefined;
  let originalContent: string | undefined;

  afterEach(() => {
    compiler = undefined;
    // Restore original file if modified
    if (originalContent !== undefined) {
      fs.writeFileSync(APP_COMPONENT_PATH.replace(/\//g, path.sep), originalContent);
      originalContent = undefined;
    }
  });

  // Scenario: 인라인 템플릿 변경 시 HMR 후보 탐지
  it("detects inline template change as HMR candidate", async () => {
    const { rootNames, compilerOptions } = loadTsConfig();
    const sourceFileCache = new AngularSourceFileCache();

    compiler = new AngularCompiler({
      rootNames,
      compilerOptions,
      sourceFileCache,
      enableHmr: true,
      compilerOptionsTransformer: (opts) => ({ ...opts, noEmit: false, declaration: false }),
    });

    // Initial build
    const initResult = await compiler.initialize();
    expect(initResult.affectedFiles).toBeDefined();

    // Modify inline template
    const filePath = APP_COMPONENT_PATH.replace(/\//g, path.sep);
    originalContent = fs.readFileSync(filePath, "utf-8");
    const modified = originalContent.replace(
      "{{ title }}",
      "{{ title }} modified",
    );
    fs.writeFileSync(filePath, modified);

    // Incremental rebuild with HMR
    const updateResult = await compiler.update([APP_COMPONENT_PATH]);

    // templateUpdates should contain the component
    expect(updateResult.templateUpdates).toBeDefined();
    expect(updateResult.templateUpdates!.size).toBeGreaterThan(0);

    // The key should contain AppComponent
    const keys = [...updateResult.templateUpdates!.keys()];
    expect(keys.some((k) => decodeURIComponent(k).includes("AppComponent"))).toBe(true);
  });

  // Scenario: 인라인 스타일 변경 시 HMR 후보 탐지
  it("detects inline style change as HMR candidate", async () => {
    const { rootNames, compilerOptions } = loadTsConfig();
    const sourceFileCache = new AngularSourceFileCache();

    compiler = new AngularCompiler({
      rootNames,
      compilerOptions,
      sourceFileCache,
      enableHmr: true,
      compilerOptionsTransformer: (opts) => ({ ...opts, noEmit: false, declaration: false }),
    });

    await compiler.initialize();

    const filePath = APP_COMPONENT_PATH.replace(/\//g, path.sep);
    originalContent = fs.readFileSync(filePath, "utf-8");
    const modified = originalContent.replace("color: $color", "color: blue");
    fs.writeFileSync(filePath, modified);

    const updateResult = await compiler.update([APP_COMPONENT_PATH]);

    expect(updateResult.templateUpdates).toBeDefined();
    expect(updateResult.templateUpdates!.size).toBeGreaterThan(0);
  });

  // Scenario: 클래스 멤버 변경 시 HMR 불가
  it("returns undefined templateUpdates when class member changes", async () => {
    const { rootNames, compilerOptions } = loadTsConfig();
    const sourceFileCache = new AngularSourceFileCache();

    compiler = new AngularCompiler({
      rootNames,
      compilerOptions,
      sourceFileCache,
      enableHmr: true,
      compilerOptionsTransformer: (opts) => ({ ...opts, noEmit: false, declaration: false }),
    });

    await compiler.initialize();

    const filePath = APP_COMPONENT_PATH.replace(/\//g, path.sep);
    originalContent = fs.readFileSync(filePath, "utf-8");
    const modified = originalContent.replace(
      'title = "test-app";',
      'title = "test-app";\n  count = 42;',
    );
    fs.writeFileSync(filePath, modified);

    const updateResult = await compiler.update([APP_COMPONENT_PATH]);

    // Class member change → HMR not possible → templateUpdates undefined
    expect(updateResult.templateUpdates).toBeUndefined();
  });

  // Scenario: 수정 파일 33개 이상이면 HMR 분석 생략
  it("skips HMR analysis when more than 32 files are modified", async () => {
    const { rootNames, compilerOptions } = loadTsConfig();
    const sourceFileCache = new AngularSourceFileCache();

    compiler = new AngularCompiler({
      rootNames,
      compilerOptions,
      sourceFileCache,
      enableHmr: true,
      compilerOptionsTransformer: (opts) => ({ ...opts, noEmit: false, declaration: false }),
    });

    await compiler.initialize();

    // Simulate 33+ modified files in cache (absolute paths required by Angular)
    for (let i = 0; i < 33; i++) {
      const fakePath = path.join(FIXTURE_DIR, `fake-file-${String(i)}.ts`).replace(/\\/g, "/");
      sourceFileCache.modifiedFiles.add(fakePath);
    }
    // Also add the real file
    sourceFileCache.modifiedFiles.add(APP_COMPONENT_PATH);
    sourceFileCache.delete(APP_COMPONENT_PATH);

    const updateResult = await compiler.initialize();

    // Too many modified files → HMR skipped → templateUpdates undefined
    expect(updateResult.templateUpdates).toBeUndefined();
  });
});
