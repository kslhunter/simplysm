import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { SdTsCompiler } from "../../src/ts-compiler/SdTsCompiler";

const NON_ANGULAR_FIXTURE = path.resolve(import.meta.dirname, "fixtures/non-angular-pkg");
const ANGULAR_FIXTURE = path.resolve(import.meta.dirname, "../angular/fixtures/packages/basic-app");
const CWD = path.resolve(import.meta.dirname, "../..");

describe("SdTsCompiler — Acceptance", () => {
  // ── Rule: tsconfig 파싱은 단일 내부 메서드로 통합 ──

  describe("tsconfig 파싱", () => {
    it("Non-Angular 패키지의 tsconfig를 파싱하고 프로그램을 생성한다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.program).toBeDefined();
      expect(result.builderProgram).toBeDefined();
      expect(result.isForAngular).toBe(false);
    });

    it("존재하지 않는 디렉토리의 tsconfig 파싱 시 에러를 throw한다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: path.join(NON_ANGULAR_FIXTURE, "nonexistent"),
        cwd: CWD,
        output: { js: false, dts: false },
      });

      await expect(compiler.compileAsync()).rejects.toThrow();
    });
  });

  // ── Rule: rootNames 필터링은 includeTests 옵션에 따라 분기 ──

  describe("rootNames 필터링", () => {
    it("includeTests 미지정 시 src/ 파일만 포함한다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();
      const rootFileNames = result.program.getRootFileNames();
      const srcDir = path.join(NON_ANGULAR_FIXTURE, "src");

      // src/ 파일은 포함
      expect(rootFileNames.some((f) => f.includes("index.ts"))).toBe(true);
      // tests/ 파일은 제외
      expect(rootFileNames.some((f) => f.includes("sample.test-file.ts"))).toBe(false);
      // 모든 root 파일이 src/ 하위
      for (const f of rootFileNames) {
        expect(path.resolve(f).startsWith(srcDir)).toBe(true);
      }
    });

    it("includeTests=true 시 tests/ 파일도 포함한다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
        includeTests: true,
      });

      const result = await compiler.compileAsync();
      const rootFileNames = result.program.getRootFileNames();

      expect(rootFileNames.some((f) => f.includes("index.ts"))).toBe(true);
      expect(rootFileNames.some((f) => f.includes("sample.test-file.ts"))).toBe(true);
    });
  });

  // ── Rule: Angular 자동 감지는 tsconfig.angularCompilerOptions 존재 여부 ──

  describe("Angular 감지", () => {
    it("angularCompilerOptions가 있으면 isForAngular=true", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.isForAngular).toBe(true);
      expect(result.program).toBeDefined();
      expect(result.builderProgram).toBeDefined();
    });

});

  // ── Rule: compilerOptions는 출력 모드에 따라 자동 설정 ──

  describe("compilerOptions 출력 모드", () => {
    it("js+dts 모드에서 declaration=true, noEmit=false", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: true, dts: true },
      });

      const result = await compiler.compileAsync();
      const opts = result.program.getCompilerOptions();

      expect(opts.noEmit).toBe(false);
      expect(opts.declaration).toBe(true);
      expect(opts.declarationMap).toBe(true);
    });

    it("타입체크 전용 모드에서 noEmit=true", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();
      const opts = result.program.getCompilerOptions();

      expect(opts.noEmit).toBe(true);
      expect(opts.declaration).toBe(false);
    });

    it("env=node에서 DOM lib가 제거된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
        env: "node",
      });

      const result = await compiler.compileAsync();
      const opts = result.program.getCompilerOptions();

      // lib 배열에 "dom" 패턴이 포함되지 않아야 한다
      if (opts.lib != null) {
        for (const lib of opts.lib) {
          expect(lib.toLowerCase()).not.toContain("dom");
        }
      }
    });

    it("compilerOptionsTransformer가 적용된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
        compilerOptionsTransformer: (opts) => ({
          ...opts,
          removeComments: true,
        }),
      });

      const result = await compiler.compileAsync();
      const opts = result.program.getCompilerOptions();

      expect(opts.removeComments).toBe(true);
    });
  });

  // ── Rule: affected files 추적은 Non-Angular/Angular 통합 분기 ──

  describe("affected files 추적", () => {
    it("Non-Angular 첫 빌드에서 affectedFiles가 Set<string>으로 반환된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.affectedFiles).toBeInstanceOf(Set);
      // 첫 빌드이므로 모든 소스 파일이 affected
      expect(result.affectedFiles!.size).toBeGreaterThan(0);
    });

    it("Non-Angular 증분 빌드에서 변경 없으면 affectedFiles가 비어있다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      await compiler.compileAsync();
      const result2 = await compiler.compileAsync(new Set());

      expect(result2.affectedFiles).toBeInstanceOf(Set);
      expect(result2.affectedFiles!.size).toBe(0);
    });

    it("Angular 첫 빌드에서 affectedFiles가 Set<string>으로 반환된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.affectedFiles).toBeInstanceOf(Set);
      expect(result.affectedFiles!.size).toBeGreaterThan(0);
    });
  });

  // ── Rule: emit은 compileAsync 내부에서 수행, Non-Angular/Angular 분기 ──

  describe("emit 처리", () => {
    const NON_ANGULAR_DIST = path.join(NON_ANGULAR_FIXTURE, "dist");

    afterEach(() => {
      // dist/ 정리
      if (fs.existsSync(NON_ANGULAR_DIST)) {
        fs.rmSync(NON_ANGULAR_DIST, { recursive: true, force: true });
      }
    });

    it("Non-Angular emit 모드에서 dist/ 파일이 생성된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: true, dts: true },
      });

      const result = await compiler.compileAsync();

      // Non-Angular emit은 writeFile 훅으로 디스크 직접 쓰기, emitResults는 undefined
      expect(result.emitResults).toBeUndefined();
      // dist 파일이 생성되어야 한다
      expect(fs.existsSync(NON_ANGULAR_DIST)).toBe(true);
    });

    it("Non-Angular noEmit 모드에서 dist/ 파일이 생성되지 않는다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.emitResults).toBeUndefined();
      expect(fs.existsSync(NON_ANGULAR_DIST)).toBe(false);
    });

    it("Angular emit 모드에서 emitResults가 EmitResult[]로 반환된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: true, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.emitResults).toBeInstanceOf(Array);
      expect(result.emitResults!.length).toBeGreaterThan(0);
      // 각 EmitResult에 filename, contents, sourceFileName이 있어야 한다
      for (const emit of result.emitResults!) {
        expect(typeof emit.filename).toBe("string");
        expect(typeof emit.contents).toBe("string");
        expect(typeof emit.sourceFileName).toBe("string");
      }
    });

    it("Angular noEmit 모드에서 emitResults가 undefined이다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.emitResults).toBeUndefined();
    });
  });

  // ── Rule: 진단 수집은 emit 후 수행, SerializedDiagnostic[]으로 통일 ──

  describe("진단 수집", () => {
    it("Non-Angular 정상 패키지에서 에러 없이 diagnostics를 반환한다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.diagnostics).toBeInstanceOf(Array);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.errors).toBeUndefined();
    });

    it("Angular 정상 패키지에서 에러 없이 diagnostics를 반환한다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.diagnostics).toBeInstanceOf(Array);
      expect(result.errorCount).toBe(0);
    });

    it("diagnostics에 포함된 항목은 SerializedDiagnostic 형태이다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      for (const diag of result.diagnostics) {
        expect(typeof diag.category).toBe("number");
        expect(typeof diag.code).toBe("number");
        expect(typeof diag.messageText).toBe("string");
      }
    });
  });

  // ── Rule: Angular 라이브러리에서 transformStylesheet 미제공 시 내부 생성 ──

  describe("SCSS 번들링 통합", () => {
    it("Angular 패키지에서 transformStylesheet 미제공 시 라이브러리 모드 콜백이 자동 생성된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      // SCSS 컴파일이 성공적으로 이루어져야 한다 (에러 없음)
      expect(result.scssErrors).toEqual([]);
      // styled.component.ts가 @use 'variables'를 사용하므로 SCSS 의존성이 수집된다
      expect(result.scssDependencies.size).toBeGreaterThan(0);
      expect(result.isForAngular).toBe(true);
    });

    it("Angular 패키지에서 transformStylesheet 제공 시 제공된 콜백이 사용된다", async () => {
      let callCount = 0;
      const customCallback = (
        data: string,
        _containingFile: string,
        _stylesheetFile?: string,
      ): Promise<string | null> => {
        callCount++;
        return Promise.resolve(data);
      };

      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
        transformStylesheet: customCallback,
      });

      await compiler.compileAsync();

      // Angular fixture에 인라인 스타일이 있으므로 콜백이 호출되어야 한다
      expect(callCount).toBeGreaterThan(0);
    });

    it("Non-Angular 패키지에서는 scssErrors와 scssDependencies가 비어있다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.scssErrors).toEqual([]);
      expect(result.scssDependencies.size).toBe(0);
    });
  });

  // ── Rule: SCSS 상태는 매 compileAsync마다 리셋된다 ──

  describe("SCSS 상태 리셋", () => {
    it("증분 빌드 시 scssDependencies가 리셋 후 재수집된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result1 = await compiler.compileAsync();
      const depsSize1 = result1.scssDependencies.size;
      expect(depsSize1).toBeGreaterThan(0);

      // 두 번째 호출 — 의존성이 리셋 후 다시 수집되어야 한다
      const result2 = await compiler.compileAsync(new Set());
      // 리셋되었으므로 이전 결과와 독립적 (축적되지 않음)
      expect(result2.scssDependencies.size).toBeLessThanOrEqual(depsSize1);
    });
  });

  // ── Rule: SCSS 의존성으로 역방향 탐색 가능 ──

  describe("findAffectedByScss", () => {
    it("SCSS 파일에 의존하는 컴포넌트 파일을 반환한다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      await compiler.compileAsync();

      // _variables.scss에 의존하는 파일을 찾는다
      const variablesPath = path.join(ANGULAR_FIXTURE, "scss", "_variables.scss");
      const affected = compiler.findAffectedByScss(variablesPath);

      // styled.component.ts가 @use 'variables'를 사용하므로 영향받아야 한다
      expect(affected.length).toBeGreaterThan(0);
      expect(affected.some((f) => f.includes("styled.component"))).toBe(true);
    });
  });

  // ── Rule: globalScss 옵션이 글로벌 SCSS 컴파일을 제어한다 ──

  describe("글로벌 SCSS 컴파일", () => {
    const DIST_STYLES = path.join(ANGULAR_FIXTURE, "dist", "styles.css");

    afterEach(() => {
      if (fs.existsSync(DIST_STYLES)) {
        fs.unlinkSync(DIST_STYLES);
      }
    });

    it("globalScss=true이고 styles.scss 존재 시 dist/styles.css가 생성된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
        globalScss: true,
      });

      const result = await compiler.compileAsync();

      expect(fs.existsSync(DIST_STYLES)).toBe(true);
      const css = fs.readFileSync(DIST_STYLES, "utf-8");
      expect(css).toContain("color:");
      expect(result.scssErrors).toEqual([]);
    });

    it("globalScss=true이고 styles.scss 미존재 시 에러 없이 무시된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
        globalScss: true,
      });

      const result = await compiler.compileAsync();

      expect(result.scssErrors).toEqual([]);
    });

    it("globalScss 미설정 시 글로벌 SCSS를 컴파일하지 않는다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      await compiler.compileAsync();

      expect(fs.existsSync(DIST_STYLES)).toBe(false);
    });
  });

  // ── Rule: Side-effect SCSS 레지스트리는 compileAsync 간 유지된다 ──

  describe("Side-effect SCSS 인프라", () => {
    it("sideEffectScssRegistry에 항목 등록 후 compileSideEffectScss로 CSS 컴파일 가능", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      await compiler.compileAsync();

      const scssPath = path.join(ANGULAR_FIXTURE, "scss", "_colors.scss");
      const cssPath = path.join(ANGULAR_FIXTURE, "dist", "_test-side-effect.css");
      compiler.sideEffectScssRegistry.set(scssPath, {
        scssAbsPath: scssPath,
        cssAbsPath: cssPath,
        sourceFileName: "test.ts",
      });

      compiler.compileSideEffectScss();

      expect(fs.existsSync(cssPath)).toBe(true);

      // 정리
      fs.unlinkSync(cssPath);
    });
  });

  // ── Rule: lint 옵션이 lint 실행을 제어한다 ──

  describe("Lint 통합", () => {
    it("lint=true 시 결과에 lint 필드가 포함된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
        lint: true,
      });

      const result = await compiler.compileAsync();

      expect(result.lint).toBeDefined();
      expect(typeof result.lint!.success).toBe("boolean");
      expect(typeof result.lint!.errorCount).toBe("number");
      expect(typeof result.lint!.warningCount).toBe("number");
    });

    it("lint 미설정 시 lint 결과가 undefined이다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result = await compiler.compileAsync();

      expect(result.lint).toBeUndefined();
    });

    it("lint=true + globalScss=true 동시 활성 시 모든 결과가 통합 반환된다", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
        lint: true,
        globalScss: true,
      });

      const result = await compiler.compileAsync();

      // lint 결과 존재
      expect(result.lint).toBeDefined();
      // globalScss 결과: scssErrors가 빈 배열 (성공)
      expect(result.scssErrors).toEqual([]);
      // 프로그램 존재
      expect(result.program).toBeDefined();
    });
  });

  // ── Rule: compileAsync는 초기빌드와 증분 리빌드를 하나의 진입점으로 처리 ──

  describe("compileAsync 증분 빌드", () => {
    it("Non-Angular 패키지의 두 번째 호출이 성공한다 (증분)", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: NON_ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result1 = await compiler.compileAsync();
      expect(result1.program).toBeDefined();

      // 두 번째 호출 (증분)
      const modifiedFiles = new Set([path.join(NON_ANGULAR_FIXTURE, "src", "util.ts")]);
      const result2 = await compiler.compileAsync(modifiedFiles);

      expect(result2.program).toBeDefined();
      expect(result2.isForAngular).toBe(false);
    });

    it("Angular 패키지의 두 번째 호출이 성공한다 (증분)", async () => {
      const compiler = new SdTsCompiler({
        pkgDir: ANGULAR_FIXTURE,
        cwd: CWD,
        output: { js: false, dts: false },
      });

      const result1 = await compiler.compileAsync();
      expect(result1.isForAngular).toBe(true);

      // 두 번째 호출 (증분, 변경 파일 없음)
      const result2 = await compiler.compileAsync(new Set());

      expect(result2.isForAngular).toBe(true);
      expect(result2.program).toBeDefined();
    });
  });
});
