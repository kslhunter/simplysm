import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type {
  SideEffectScssOptions,
  SideEffectScssEntry,
} from "../../src/utils/ngtsc-build-core";
import path from "path";
import fs from "fs";
import os from "os";

describe("writeEmitResults", () => {
  let tmpDir: string;
  let pkgDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "write-emit-"));
    pkgDir = path.join(tmpDir, "my-pkg");
    fs.mkdirSync(path.join(pkgDir, "dist"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("emitResults를 output-path-rewriting 적용하여 파일로 쓴다", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    const distDir = path.join(pkgDir, "dist");
    // Simulate nested output: dist/my-pkg/src/index.js
    const nestedPath = path.join(distDir, "my-pkg", "src", "index.js");
    const emitResults = [
      { filename: nestedPath, contents: "export const x = 1;" },
    ];

    writeEmitResults(emitResults, pkgDir);

    // Rewritten to flat: dist/index.js
    const flatPath = path.join(distDir, "index.js");
    expect(fs.existsSync(flatPath)).toBe(true);
    expect(fs.readFileSync(flatPath, "utf-8")).toBe("export const x = 1;");
  });

  it("output-path-rewriter가 null을 반환하면 파일을 쓰지 않는다", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    const distDir = path.join(pkgDir, "dist");
    // Nested output from OTHER package: dist/other-pkg/src/index.js
    const otherNestedPath = path.join(distDir, "other-pkg", "src", "index.js");
    const emitResults = [
      { filename: otherNestedPath, contents: "export const y = 2;" },
    ];

    writeEmitResults(emitResults, pkgDir);

    // Should NOT be written
    expect(fs.existsSync(otherNestedPath)).toBe(false);
    // Also not rewritten anywhere
    const flatPath = path.join(distDir, "index.js");
    expect(fs.existsSync(flatPath)).toBe(false);
  });

  it("이미 flat 구조인 경로는 그대로 쓴다", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    const distDir = path.join(pkgDir, "dist");
    const flatPath = path.join(distDir, "index.js");
    const emitResults = [
      { filename: flatPath, contents: "export const z = 3;" },
    ];

    writeEmitResults(emitResults, pkgDir);

    expect(fs.existsSync(flatPath)).toBe(true);
    expect(fs.readFileSync(flatPath, "utf-8")).toBe("export const z = 3;");
  });

  it("디렉��리가 없으면 ��동 생성한다", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    const distDir = path.join(pkgDir, "dist");
    // Nested path under new subdirectory
    const nestedPath = path.join(distDir, "my-pkg", "src", "sub", "deep.js");
    const emitResults = [
      { filename: nestedPath, contents: "export const deep = true;" },
    ];

    writeEmitResults(emitResults, pkgDir);

    const flatPath = path.join(distDir, "sub", "deep.js");
    expect(fs.existsSync(flatPath)).toBe(true);
  });
});

// Acceptance: Scenario "기본 side-effect SCSS 컴파일"
describe("writeEmitResults with side-effect SCSS", () => {
  let tmpDir: string;
  let pkgDir: string;
  let srcDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "write-emit-scss-"));
    pkgDir = path.join(tmpDir, "my-pkg");
    srcDir = path.join(pkgDir, "src");
    fs.mkdirSync(path.join(pkgDir, "dist"), { recursive: true });
    fs.mkdirSync(path.join(srcDir, "ui", "layout"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("compiles side-effect SCSS to CSS and rewrites import path in JS", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    // Create source SCSS file
    const scssPath = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    fs.writeFileSync(scssPath, ".sd-flex { display: flex; }", "utf-8");

    const distDir = path.join(pkgDir, "dist");
    // Simulate emitted JS that has .scss side-effect import
    const jsPath = path.join(distDir, "my-pkg", "src", "ui", "layout", "sd-flex.directive.js");
    const jsContents = 'import "./sd-flex.scss";\nexport class SdFlexDirective {}';
    const emitResults = [
      { filename: jsPath, contents: jsContents, sourceFileName: path.join(srcDir, "ui", "layout", "sd-flex.directive.ts") },
    ];

    const scss: SideEffectScssOptions = {
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
    };
    writeEmitResults(emitResults, pkgDir, scss);

    // JS should have .scss rewritten to .css
    const flatJsPath = path.join(distDir, "ui", "layout", "sd-flex.directive.js");
    expect(fs.existsSync(flatJsPath)).toBe(true);
    const jsOutput = fs.readFileSync(flatJsPath, "utf-8");
    expect(jsOutput).toContain('import "./sd-flex.css"');
    expect(jsOutput).not.toContain(".scss");

    // CSS file should be generated
    const cssPath = path.join(distDir, "ui", "layout", "sd-flex.css");
    expect(fs.existsSync(cssPath)).toBe(true);
    const cssOutput = fs.readFileSync(cssPath, "utf-8");
    expect(cssOutput).toContain("display: flex");

    // No errors
    expect(scss.scssErrors).toEqual([]);
  });

  // Acceptance: Scenario "SCSS @use 의존성 해석"
  it("resolves SCSS @use dependencies via loadPaths", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    // Create SCSS load path with a shared variables file
    const scssLoadDir = path.join(pkgDir, "scss");
    fs.mkdirSync(path.join(scssLoadDir, "commons"), { recursive: true });
    fs.writeFileSync(
      path.join(scssLoadDir, "commons", "_variables.scss"),
      "$primary: #ff0000;",
      "utf-8",
    );

    // Create source SCSS that uses @use
    const scssPath = path.join(srcDir, "ui", "layout", "sd-card.scss");
    fs.writeFileSync(
      scssPath,
      '@use "commons/variables" as vars;\n.sd-card { color: vars.$primary; }',
      "utf-8",
    );

    const distDir = path.join(pkgDir, "dist");
    const jsPath = path.join(distDir, "my-pkg", "src", "ui", "layout", "sd-card.directive.js");
    const emitResults = [
      {
        filename: jsPath,
        contents: 'import "./sd-card.scss";\nexport class SdCardDirective {}',
        sourceFileName: path.join(srcDir, "ui", "layout", "sd-card.directive.ts"),
      },
    ];

    const scss: SideEffectScssOptions = {
      loadPaths: [scssLoadDir],
      scssErrors: [],
      scssDependencies: new Map(),
    };
    writeEmitResults(emitResults, pkgDir, scss);

    const cssPath = path.join(distDir, "ui", "layout", "sd-card.css");
    expect(fs.existsSync(cssPath)).toBe(true);
    const cssOutput = fs.readFileSync(cssPath, "utf-8");
    expect(cssOutput).toContain("#ff0000");
    expect(scss.scssErrors).toEqual([]);
  });

  // Acceptance: Scenario "SCSS 컴파일 에러"
  it("reports SCSS compilation error in scssErrors", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    // Create SCSS file with syntax error
    const scssPath = path.join(srcDir, "ui", "layout", "broken.scss");
    fs.writeFileSync(scssPath, ".broken { color: ; }", "utf-8");

    const distDir = path.join(pkgDir, "dist");
    const jsPath = path.join(distDir, "my-pkg", "src", "ui", "layout", "broken.directive.js");
    const emitResults = [
      {
        filename: jsPath,
        contents: 'import "./broken.scss";\nexport class BrokenDirective {}',
        sourceFileName: path.join(srcDir, "ui", "layout", "broken.directive.ts"),
      },
    ];

    const scss: SideEffectScssOptions = {
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
    };
    writeEmitResults(emitResults, pkgDir, scss);

    // Should have error recorded
    expect(scss.scssErrors.length).toBeGreaterThan(0);
    expect(scss.scssErrors[0]).toContain("SCSS error");
  });

  // Acceptance: Scenario "참조하는 SCSS 파일이 존재하지 않음"
  it("reports error when referenced SCSS file does not exist", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    const distDir = path.join(pkgDir, "dist");
    const jsPath = path.join(distDir, "my-pkg", "src", "ui", "layout", "missing.directive.js");
    const emitResults = [
      {
        filename: jsPath,
        contents: 'import "./missing.scss";\nexport class MissingDirective {}',
        sourceFileName: path.join(srcDir, "ui", "layout", "missing.directive.ts"),
      },
    ];

    const scss: SideEffectScssOptions = {
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
    };
    writeEmitResults(emitResults, pkgDir, scss);

    expect(scss.scssErrors.length).toBeGreaterThan(0);
    expect(scss.scssErrors[0]).toContain("SCSS error");
  });
});

// Feature 1.2: writeEmitResults with registry
describe("writeEmitResults with registry", () => {
  let tmpDir: string;
  let pkgDir: string;
  let srcDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "write-emit-registry-"));
    pkgDir = path.join(tmpDir, "my-pkg");
    srcDir = path.join(pkgDir, "src");
    fs.mkdirSync(path.join(pkgDir, "dist"), { recursive: true });
    fs.mkdirSync(path.join(srcDir, "ui", "layout"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("registers side-effect SCSS entries in registry when provided", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    // Create source SCSS file
    const scssPath = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    fs.writeFileSync(scssPath, ".sd-flex { display: flex; }", "utf-8");

    const distDir = path.join(pkgDir, "dist");
    const jsPath = path.join(distDir, "my-pkg", "src", "ui", "layout", "sd-flex.directive.js");
    const emitResults = [
      {
        filename: jsPath,
        contents: 'import "./sd-flex.scss";\nexport class SdFlexDirective {}',
        sourceFileName: path.join(srcDir, "ui", "layout", "sd-flex.directive.ts"),
      },
    ];

    const registry = new Map<string, SideEffectScssEntry>();
    const scss: SideEffectScssOptions = {
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
      registry,
    };
    writeEmitResults(emitResults, pkgDir, scss);

    // Registry should have the entry keyed by scssAbsPath
    expect(registry.size).toBe(1);
    expect(registry.has(scssPath)).toBe(true);
    const entry = registry.get(scssPath)!;
    expect(entry.scssAbsPath).toBe(scssPath);
    expect(entry.cssAbsPath).toBe(path.join(distDir, "ui", "layout", "sd-flex.css"));
    expect(entry.sourceFileName).toBe(
      path.join(srcDir, "ui", "layout", "sd-flex.directive.ts"),
    );
  });

  it("clears stale registry entries for re-emitted source file before registering new ones", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    const scssPath = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    fs.writeFileSync(scssPath, ".sd-flex { display: flex; }", "utf-8");

    const distDir = path.join(pkgDir, "dist");
    const jsPath = path.join(distDir, "my-pkg", "src", "ui", "layout", "sd-flex.directive.js");
    const sourceFileName = path.join(srcDir, "ui", "layout", "sd-flex.directive.ts");

    // Pre-populate registry with a stale entry for this sourceFileName (keyed by old scssAbsPath)
    const staleScssPath = path.join(srcDir, "ui", "layout", "old.scss");
    const registry = new Map<string, SideEffectScssEntry>();
    registry.set(staleScssPath, {
      scssAbsPath: staleScssPath,
      cssAbsPath: path.join(distDir, "ui", "layout", "old.css"),
      sourceFileName,
    });

    const emitResults = [
      {
        filename: jsPath,
        contents: 'import "./sd-flex.scss";\nexport class SdFlexDirective {}',
        sourceFileName,
      },
    ];

    const scss: SideEffectScssOptions = {
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
      registry,
    };
    writeEmitResults(emitResults, pkgDir, scss);

    // Old entry should be removed and replaced with new one (keyed by scssAbsPath)
    expect(registry.size).toBe(1);
    expect(registry.has(staleScssPath)).toBe(false);
    expect(registry.get(scssPath)!.scssAbsPath).toBe(scssPath);
  });

  it("removes registry entry when source file is re-emitted without SCSS imports", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    const distDir = path.join(pkgDir, "dist");
    const sourceFileName = path.join(srcDir, "ui", "layout", "sd-flex.directive.ts");

    // Pre-populate registry (keyed by scssAbsPath)
    const scssAbsPath = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    const registry = new Map<string, SideEffectScssEntry>();
    registry.set(scssAbsPath, {
      scssAbsPath,
      cssAbsPath: path.join(distDir, "ui", "layout", "sd-flex.css"),
      sourceFileName,
    });

    // Re-emit without SCSS import
    const jsPath = path.join(distDir, "my-pkg", "src", "ui", "layout", "sd-flex.directive.js");
    const emitResults = [
      {
        filename: jsPath,
        contents: "export class SdFlexDirective {}",
        sourceFileName,
      },
    ];

    const scss: SideEffectScssOptions = {
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
      registry,
    };
    writeEmitResults(emitResults, pkgDir, scss);

    // Registry should be empty (stale entry for this sourceFileName removed)
    expect(registry.size).toBe(0);
  });

  it("preserves registry entries for non-emitted source files", async () => {
    const { writeEmitResults } = await import("../../src/utils/angular-build-pipeline");

    const distDir = path.join(pkgDir, "dist");
    const sourceFileA = path.join(srcDir, "ui", "layout", "sd-flex.directive.ts");
    const sourceFileB = path.join(srcDir, "ui", "layout", "sd-card.directive.ts");

    // Pre-populate registry with entries for both files (keyed by scssAbsPath)
    const scssPathA = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    const scssPathB = path.join(srcDir, "ui", "layout", "sd-card.scss");
    const registry = new Map<string, SideEffectScssEntry>();
    registry.set(scssPathA, {
      scssAbsPath: scssPathA,
      cssAbsPath: path.join(distDir, "ui", "layout", "sd-flex.css"),
      sourceFileName: sourceFileA,
    });
    registry.set(scssPathB, {
      scssAbsPath: scssPathB,
      cssAbsPath: path.join(distDir, "ui", "layout", "sd-card.css"),
      sourceFileName: sourceFileB,
    });

    // Only emit file A (without SCSS import)
    const jsPath = path.join(distDir, "my-pkg", "src", "ui", "layout", "sd-flex.directive.js");
    const emitResults = [
      {
        filename: jsPath,
        contents: "export class SdFlexDirective {}",
        sourceFileName: sourceFileA,
      },
    ];

    const scss: SideEffectScssOptions = {
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
      registry,
    };
    writeEmitResults(emitResults, pkgDir, scss);

    // File A's entry should be removed, file B's should be preserved
    expect(registry.size).toBe(1);
    expect(registry.has(scssPathA)).toBe(false);
    expect(registry.has(scssPathB)).toBe(true);
  });
});

// Feature 1.2: compileSideEffectScss
describe("compileSideEffectScss", () => {
  let tmpDir: string;
  let pkgDir: string;
  let srcDir: string;
  let distDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "compile-se-scss-"));
    pkgDir = path.join(tmpDir, "my-pkg");
    srcDir = path.join(pkgDir, "src");
    distDir = path.join(pkgDir, "dist");
    fs.mkdirSync(path.join(distDir, "ui", "layout"), { recursive: true });
    fs.mkdirSync(path.join(srcDir, "ui", "layout"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Scenario: side-effect SCSS 파일 내용 변경
  it("compiles all registry entries to CSS", async () => {
    const { compileSideEffectScss } = await import("../../src/utils/ngtsc-build-core");

    // Create source SCSS
    const scssPath = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    fs.writeFileSync(scssPath, ".sd-flex { display: flex; }", "utf-8");

    const cssAbsPath = path.join(distDir, "ui", "layout", "sd-flex.css");
    const sourceFileName = path.join(srcDir, "ui", "layout", "sd-flex.directive.ts");
    const registry = new Map<string, SideEffectScssEntry>();
    registry.set(scssPath, { scssAbsPath: scssPath, cssAbsPath, sourceFileName });

    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    compileSideEffectScss(registry, [], scssErrors, scssDependencies);

    expect(fs.existsSync(cssAbsPath)).toBe(true);
    expect(fs.readFileSync(cssAbsPath, "utf-8")).toContain("display: flex");
    expect(scssErrors).toEqual([]);
  });

  // Scenario: 여러 side-effect SCSS 파일 동시 변경
  it("compiles multiple registry entries", async () => {
    const { compileSideEffectScss } = await import("../../src/utils/ngtsc-build-core");

    // Create two SCSS files
    const scssPath1 = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    fs.writeFileSync(scssPath1, ".sd-flex { display: inline-flex; }", "utf-8");
    const scssPath2 = path.join(srcDir, "ui", "layout", "sd-card.scss");
    fs.writeFileSync(scssPath2, ".sd-card { border-radius: 4px; }", "utf-8");

    const cssPath1 = path.join(distDir, "ui", "layout", "sd-flex.css");
    const cssPath2 = path.join(distDir, "ui", "layout", "sd-card.css");
    const sourceFile1 = path.join(srcDir, "ui", "layout", "sd-flex.directive.ts");
    const sourceFile2 = path.join(srcDir, "ui", "layout", "sd-card.directive.ts");

    const registry = new Map<string, SideEffectScssEntry>();
    registry.set(scssPath1, { scssAbsPath: scssPath1, cssAbsPath: cssPath1, sourceFileName: sourceFile1 });
    registry.set(scssPath2, { scssAbsPath: scssPath2, cssAbsPath: cssPath2, sourceFileName: sourceFile2 });

    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    compileSideEffectScss(registry, [], scssErrors, scssDependencies);

    expect(fs.readFileSync(cssPath1, "utf-8")).toContain("display: inline-flex");
    expect(fs.readFileSync(cssPath2, "utf-8")).toContain("border-radius: 4px");
    expect(scssErrors).toEqual([]);
  });

  // Scenario: @use 의존성 파일 변경
  it("resolves @use dependencies via loadPaths and tracks them", async () => {
    const { compileSideEffectScss } = await import("../../src/utils/ngtsc-build-core");

    // Create shared variables file
    const scssLoadDir = path.join(pkgDir, "scss");
    fs.mkdirSync(path.join(scssLoadDir, "commons"), { recursive: true });
    fs.writeFileSync(
      path.join(scssLoadDir, "commons", "_variables.scss"),
      "$gap: 16px;",
      "utf-8",
    );

    // Create SCSS that uses @use
    const scssPath = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    fs.writeFileSync(
      scssPath,
      '@use "commons/variables" as vars;\n.sd-flex { gap: vars.$gap; }',
      "utf-8",
    );

    const cssAbsPath = path.join(distDir, "ui", "layout", "sd-flex.css");
    const sourceFileName = path.join(srcDir, "ui", "layout", "sd-flex.directive.ts");
    const registry = new Map<string, SideEffectScssEntry>();
    registry.set(scssPath, { scssAbsPath: scssPath, cssAbsPath, sourceFileName });

    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    compileSideEffectScss(registry, [scssLoadDir], scssErrors, scssDependencies);

    expect(fs.readFileSync(cssAbsPath, "utf-8")).toContain("16px");
    expect(scssErrors).toEqual([]);

    // Dependencies should be tracked
    const deps = scssDependencies.get(sourceFileName);
    expect(deps).toBeDefined();
    expect(deps!.size).toBeGreaterThan(0);
    // Should contain the _variables.scss path
    const depsArr = [...deps!];
    expect(depsArr.some((d) => d.includes("_variables.scss"))).toBe(true);
  });

  // Scenario: 간접 의존성 변경
  it("tracks transitive @use dependencies", async () => {
    const { compileSideEffectScss } = await import("../../src/utils/ngtsc-build-core");

    // Create transitive dependency chain: sd-flex.scss -> _mixins.scss -> _variables.scss
    const scssLoadDir = path.join(pkgDir, "scss");
    fs.mkdirSync(path.join(scssLoadDir, "commons"), { recursive: true });
    fs.writeFileSync(
      path.join(scssLoadDir, "commons", "_variables.scss"),
      "$size: 8px;",
      "utf-8",
    );
    fs.writeFileSync(
      path.join(scssLoadDir, "commons", "_mixins.scss"),
      '@use "commons/variables" as vars;\n@mixin box { width: vars.$size; }',
      "utf-8",
    );

    const scssPath = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    fs.writeFileSync(
      scssPath,
      '@use "commons/mixins";\n.sd-flex { @include mixins.box; }',
      "utf-8",
    );

    const cssAbsPath = path.join(distDir, "ui", "layout", "sd-flex.css");
    const sourceFileName = path.join(srcDir, "ui", "layout", "sd-flex.directive.ts");
    const registry = new Map<string, SideEffectScssEntry>();
    registry.set(scssPath, { scssAbsPath: scssPath, cssAbsPath, sourceFileName });

    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    compileSideEffectScss(registry, [scssLoadDir], scssErrors, scssDependencies);

    expect(fs.readFileSync(cssAbsPath, "utf-8")).toContain("8px");
    expect(scssErrors).toEqual([]);

    // Should track both direct and transitive dependencies
    const deps = scssDependencies.get(sourceFileName);
    expect(deps).toBeDefined();
    const depsArr = [...deps!];
    expect(depsArr.some((d) => d.includes("_mixins.scss"))).toBe(true);
    expect(depsArr.some((d) => d.includes("_variables.scss"))).toBe(true);
  });

  // Scenario: SCSS 문법 에러
  it("reports error and preserves existing CSS when SCSS has syntax error", async () => {
    const { compileSideEffectScss } = await import("../../src/utils/ngtsc-build-core");

    // Create existing CSS (from previous successful build)
    const cssAbsPath = path.join(distDir, "ui", "layout", "sd-flex.css");
    fs.writeFileSync(cssAbsPath, ".sd-flex { display: flex; }", "utf-8");

    // Create SCSS with syntax error
    const scssPath = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    fs.writeFileSync(scssPath, ".sd-flex { color: ; }", "utf-8");

    const sourceFileName = path.join(srcDir, "ui", "layout", "sd-flex.directive.ts");
    const registry = new Map<string, SideEffectScssEntry>();
    registry.set(scssPath, { scssAbsPath: scssPath, cssAbsPath, sourceFileName });

    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    compileSideEffectScss(registry, [], scssErrors, scssDependencies);

    // Error should be reported
    expect(scssErrors.length).toBeGreaterThan(0);
    expect(scssErrors[0]).toContain("SCSS error");

    // Existing CSS should be preserved
    expect(fs.readFileSync(cssAbsPath, "utf-8")).toBe(".sd-flex { display: flex; }");
  });

  // Scenario: 에러 수정 후 정상 재빌드
  it("compiles successfully after fixing syntax error", async () => {
    const { compileSideEffectScss } = await import("../../src/utils/ngtsc-build-core");

    const scssPath = path.join(srcDir, "ui", "layout", "sd-flex.scss");
    const cssAbsPath = path.join(distDir, "ui", "layout", "sd-flex.css");
    const sourceFileName = path.join(srcDir, "ui", "layout", "sd-flex.directive.ts");

    const registry = new Map<string, SideEffectScssEntry>();
    registry.set(scssPath, { scssAbsPath: scssPath, cssAbsPath, sourceFileName });

    // First build: syntax error
    fs.writeFileSync(scssPath, ".sd-flex { color: ; }", "utf-8");
    const scssErrors1: string[] = [];
    const scssDependencies1 = new Map<string, Set<string>>();
    compileSideEffectScss(registry, [], scssErrors1, scssDependencies1);
    expect(scssErrors1.length).toBeGreaterThan(0);

    // Second build: fix error
    fs.writeFileSync(scssPath, ".sd-flex { display: inline-flex; }", "utf-8");
    const scssErrors2: string[] = [];
    const scssDependencies2 = new Map<string, Set<string>>();
    compileSideEffectScss(registry, [], scssErrors2, scssDependencies2);

    expect(scssErrors2).toEqual([]);
    expect(fs.readFileSync(cssAbsPath, "utf-8")).toContain("display: inline-flex");
  });
});
