import { describe, it, expect } from "vitest";
import path from "path";
import { SdTsCompiler } from "../../src/ts-compiler/SdTsCompiler";

const NON_ANGULAR_FIXTURE = path.resolve(import.meta.dirname, "fixtures/non-angular-pkg");
const ANGULAR_FIXTURE = path.resolve(import.meta.dirname, "../angular/fixtures/packages/basic-app");
const CWD = path.resolve(import.meta.dirname, "../..");

describe("SdTsCompiler — Unit", () => {
  // ── compilerOptions: JS only (dts=false) ──
  it("js-only 모드에서 declaration=false, noEmit=false", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: true, dts: false },
    });

    const result = await compiler.compileAsync();
    const opts = result.program.getCompilerOptions();

    expect(opts.noEmit).toBe(false);
    expect(opts.declaration).toBe(false);
    expect(opts.emitDeclarationOnly).toBe(false);
  });

  // ── compilerOptions: DTS only (js=false) ──
  it("dts-only 모드에서 emitDeclarationOnly=true", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: true },
    });

    const result = await compiler.compileAsync();
    const opts = result.program.getCompilerOptions();

    expect(opts.noEmit).toBe(false);
    expect(opts.emitDeclarationOnly).toBe(true);
    expect(opts.declaration).toBe(true);
    expect(opts.declarationMap).toBe(true);
  });

  // ── sourceMap: Non-Angular js=true → sourceMap=true ──
  it("Non-Angular js 출력 시 sourceMap=true", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: true, dts: false },
    });

    const result = await compiler.compileAsync();
    const opts = result.program.getCompilerOptions();
    expect(opts.sourceMap).toBe(true);
  });

  // ── sourceMap: Angular → sourceMap=false ──
  it("Angular 패키지에서 sourceMap=false", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: true, dts: false },
    });

    const result = await compiler.compileAsync();
    const opts = result.program.getCompilerOptions();
    expect(opts.sourceMap).toBe(false);
  });

  // ── incremental + tsBuildInfoFile ──
  it("incremental=true이고 tsBuildInfoFile이 설정된다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: true, dts: true },
    });

    const result = await compiler.compileAsync();
    const opts = result.program.getCompilerOptions();

    expect(opts.incremental).toBe(true);
    expect(opts.tsBuildInfoFile).toBeDefined();
    expect(opts.tsBuildInfoFile).toContain(".cache");
    expect(opts.tsBuildInfoFile).toContain("build");
  });

  // ── Angular tsBuildInfoFile uses ngtsc prefix ──
  it("Angular 패키지의 tsBuildInfoFile은 ngtsc 접두사를 사용한다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    const result = await compiler.compileAsync();
    const opts = result.program.getCompilerOptions();

    expect(opts.tsBuildInfoFile).toContain("ngtsc");
  });

  // ── env=browser → types에서 node 제외 ──
  it("env=browser에서 types에서 node를 제외한다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
      env: "browser",
    });

    const result = await compiler.compileAsync();
    const opts = result.program.getCompilerOptions();

    // browser env에서 types가 설정되면 node는 제외되어야 한다
    if (opts.types != null) {
      expect(opts.types).not.toContain("node");
    }
  });

  // ── Program이 올바른 root 파일을 가지고 있다 ──
  it("Program의 root 파일이 fixture src 파일을 포함한다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    const result = await compiler.compileAsync();
    const sourceFiles = result.program.getSourceFiles();

    // fixture의 소스 파일이 프로그램에 포함되어야 한다
    const fileNames = sourceFiles.map((sf) => sf.fileName);
    expect(fileNames.some((f) => f.includes("index.ts"))).toBe(true);
    expect(fileNames.some((f) => f.includes("util.ts"))).toBe(true);
  });

  // ── BuilderProgram과 Program의 일관성 ──
  it("builderProgram.getProgram()이 result.program과 동일하다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    const result = await compiler.compileAsync();
    expect(result.builderProgram.getProgram()).toBe(result.program);
  });

  // ── affected files ──
  it("affectedFiles에 포함된 경로는 posix 형식이다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    const result = await compiler.compileAsync();

    if (result.affectedFiles != null) {
      for (const f of result.affectedFiles) {
        expect(f).not.toContain("\\");
      }
    }
  });

  it("결과에 diagnostics, errorCount, warningCount가 포함된다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    const result = await compiler.compileAsync();

    expect(result.diagnostics).toBeInstanceOf(Array);
    expect(typeof result.errorCount).toBe("number");
    expect(typeof result.warningCount).toBe("number");
  });

  // ── ngtscProgram 결과 필드 ──

  it("Angular 패키지에서 ngtscProgram이 결과에 포함된다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    const result = await compiler.compileAsync();
    expect(result.ngtscProgram).toBeDefined();
    expect(result.ngtscProgram!.compiler).toBeDefined();
  });

  it("Non-Angular 패키지에서 ngtscProgram이 undefined이다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    const result = await compiler.compileAsync();
    expect(result.ngtscProgram).toBeUndefined();
  });

  // ── SCSS 결과 필드 ──

  it("결과에 scssErrors와 scssDependencies가 항상 포함된다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    const result = await compiler.compileAsync();

    expect(result.scssErrors).toBeInstanceOf(Array);
    expect(result.scssDependencies).toBeInstanceOf(Map);
  });

  // ── findAffectedByScss: 빈 맵에서 빈 결과 ──

  it("findAffectedByScss는 compileAsync 전에도 빈 배열을 반환한다", () => {
    const compiler = new SdTsCompiler({
      pkgDir: NON_ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    const affected = compiler.findAffectedByScss("/some/path.scss");
    expect(affected).toEqual([]);
  });

  // ── findAffectedByScss: 의존성 없는 파일에 대해 빈 결과 ──

  it("findAffectedByScss는 의존성이 없는 SCSS 경로에 대해 빈 배열을 반환한다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    await compiler.compileAsync();

    const affected = compiler.findAffectedByScss("/nonexistent/style.scss");
    expect(affected).toEqual([]);
  });

  // ── SCSS 의존성: _colors.scss 간접 의존 ──

  it("SCSS 의존성 체인의 말단 파일도 역방향 탐색에 포함된다", async () => {
    const compiler = new SdTsCompiler({
      pkgDir: ANGULAR_FIXTURE,
      cwd: CWD,
      output: { js: false, dts: false },
    });

    await compiler.compileAsync();

    // _colors.scss는 _variables.scss에서 @use되고,
    // _variables.scss는 styled.component.ts에서 사용된다
    const colorsPath = path.join(ANGULAR_FIXTURE, "scss", "_colors.scss");
    const affected = compiler.findAffectedByScss(colorsPath);

    // 간접 의존 체인이므로 styled.component.ts가 영향받아야 한다
    expect(affected.some((f) => f.includes("styled.component"))).toBe(true);
  });
});
