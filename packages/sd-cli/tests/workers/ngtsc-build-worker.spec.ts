import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path, { resolve } from "node:path";
import fs from "node:fs";
import { pathx } from "@simplysm/core-node";
import { AngularBuildPipeline } from "../../src/utils/angular-build-pipeline";
import { buildCompilerOptions, buildScssLoadPaths, compileGlobalScss } from "../../src/utils/ngtsc-build-core";
import { parseTsconfig, getPackageSourceFiles } from "../../src/utils/tsconfig";

const FIXTURE_DIR = resolve(import.meta.dirname, "../angular/fixtures/packages/basic-lib");
const distDir = resolve(FIXTURE_DIR, "dist");

async function buildWithPipeline(options: {
  js: boolean;
  dts: boolean;
}): Promise<{ success: boolean; errors?: string[] }> {
  const parsedConfig = parseTsconfig(FIXTURE_DIR);
  const sourceFiles = getPackageSourceFiles(FIXTURE_DIR, parsedConfig);
  const compilerOptions = buildCompilerOptions(parsedConfig.options, FIXTURE_DIR, {
    js: options.js,
    dts: options.dts,
  });
  const angularOptions = (parsedConfig.raw?.angularCompilerOptions ?? {}) as Record<string, unknown>;

  const pipeline = new AngularBuildPipeline({
    mode: "library",
    pkgDir: FIXTURE_DIR,
    cwd: FIXTURE_DIR,
    rootNames: sourceFiles,
    compilerOptions,
    angularCompilerOptions: angularOptions,
  });

  const result = await pipeline.initialize();
  const normalizedSrcDir = pathx.posix(path.join(FIXTURE_DIR, "src"));
  pipeline.writeEmitResults({
    pkgDir: FIXTURE_DIR,
    sourceFilter: (fileName) => pathx.posix(fileName).startsWith(normalizedSrcDir + "/"),
  });

  const errors = result.diagnostics.errors.map((e) => e.message);
  return {
    success: result.diagnostics.errors.length === 0 && result.scssErrors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

describe("ngtsc-build-core: NgtscProgram AOT compilation", () => {
  beforeAll(() => {
    // Clean dist before tests
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  });

  afterAll(() => {
    // Clean up dist after tests
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  });

  // Acceptance: Scenario "@Injectable 데코레이터가 런타임 코드로 변환된다"
  it("transforms @Injectable decorator to runtime ɵprov factory", async () => {
    const result = await buildWithPipeline({ js: true, dts: false });

    // Debug: print errors if build failed
    if (!result.success) {
      console.error("Build errors:", result.errors);
    }

    expect(result.success).toBe(true);

    // Find the provider file output
    const providerJsPath = resolve(distDir, "test-provider.js");
    expect(fs.existsSync(providerJsPath)).toBe(true);

    const content = fs.readFileSync(providerJsPath, "utf-8");
    // ɵprov is the Angular injectable factory
    expect(content).toContain("ɵprov");
    // Original @Injectable decorator should be removed
    expect(content).not.toContain("@Injectable");
  }, 60_000);

  // Acceptance: Scenario "@Directive 데코레이터가 런타임 코드로 변환된다"
  it("transforms @Directive decorator to runtime ɵdir definition", () => {
    // dist already populated from prior test, check directive
    const directiveJsPath = resolve(distDir, "test-directive.js");
    expect(fs.existsSync(directiveJsPath)).toBe(true);

    const content = fs.readFileSync(directiveJsPath, "utf-8");
    expect(content).toContain("ɵdir");
  }, 60_000);

  // Acceptance: Scenario ".d.ts 파일이 Angular 메타데이터를 포함하여 출력된다"
  it("outputs .d.ts files with Angular type metadata", async () => {
    // Clean dist and run with dts: true
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }

    const result = await buildWithPipeline({ js: true, dts: true });

    expect(result.success).toBe(true);

    const providerDtsPath = resolve(distDir, "test-provider.d.ts");
    expect(fs.existsSync(providerDtsPath)).toBe(true);

    const content = fs.readFileSync(providerDtsPath, "utf-8");
    // Angular .d.ts includes ɵ metadata fields
    expect(content).toMatch(/ɵ(prov|fac)/);
  }, 60_000);

  // Acceptance: Scenario "run()으로 one-time 빌드를 수행한다"
  it("produces both JS and .d.ts when output is {js: true, dts: true}", () => {
    // dist already populated from prior test
    const jsExists = fs.existsSync(resolve(distDir, "test-provider.js"));
    const dtsExists = fs.existsSync(resolve(distDir, "test-provider.d.ts"));

    expect(jsExists).toBe(true);
    expect(dtsExists).toBe(true);
  }, 60_000);

  // Acceptance: Scenario "run()에서 dts: false면 .d.ts를 생략한다"
  it("omits .d.ts when output is {js: true, dts: false}", async () => {
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }

    const result = await buildWithPipeline({ js: true, dts: false });

    expect(result.success).toBe(true);

    const jsExists = fs.existsSync(resolve(distDir, "test-provider.js"));
    expect(jsExists).toBe(true);

    // Should NOT have .d.ts files
    const dtsExists = fs.existsSync(resolve(distDir, "test-provider.d.ts"));
    expect(dtsExists).toBe(false);
  }, 60_000);

  // Acceptance: Scenario "TypeScript + Angular diagnostics를 통합 수집한다"
  it("collects diagnostics from both TypeScript and Angular compiler", async () => {
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }

    const result = await buildWithPipeline({ js: true, dts: true });

    // Angular package should compile cleanly
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  }, 60_000);

  // Acceptance: Scenario "빌드 결과 구조가 항상 반환된다"
  it("returns complete result structure even when build succeeds", async () => {
    const result = await buildWithPipeline({ js: true, dts: true });

    // Verify result structure completeness
    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  }, 60_000);

  // Acceptance: Scenario "scss/styles.scss가 CSS로 컴파일되어 dist에 출력된다"
  it("compiles scss/styles.scss to dist/styles.css", async () => {
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }

    const result = await buildWithPipeline({ js: true, dts: false });
    expect(result.success).toBe(true);

    // global SCSS는 Pipeline 외부에서 별도 호출
    const loadPaths = buildScssLoadPaths({
      name: "basic-lib",
      cwd: FIXTURE_DIR,
      pkgDir: FIXTURE_DIR,
      output: { js: true, dts: false },
    });
    const globalErrors = compileGlobalScss(FIXTURE_DIR, loadPaths);
    expect(globalErrors).toEqual([]);

    const stylesCssPath = resolve(distDir, "styles.css");
    expect(fs.existsSync(stylesCssPath)).toBe(true);

    const content = fs.readFileSync(stylesCssPath, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  }, 60_000);

  // Acceptance: Scenario "scss/styles.scss가 없으면 전역 스타일 컴파일을 건너뛴다"
  it("skips global SCSS when scss/styles.scss does not exist", () => {
    const nonExistentPkgDir = resolve(import.meta.dirname, "__nonexistent_pkg__");

    const errors = compileGlobalScss(nonExistentPkgDir, []);

    // No errors and no dist/styles.css created
    expect(errors).toEqual([]);
    expect(fs.existsSync(resolve(nonExistentPkgDir, "dist", "styles.css"))).toBe(false);
  });
});
