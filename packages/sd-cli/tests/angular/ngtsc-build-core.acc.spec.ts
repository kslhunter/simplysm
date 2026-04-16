import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import type { SideEffectScssEntry, SideEffectScssOptions } from "../../src/angular/ngtsc-build-core";

// Mock fs — filesystem I/O (OS 의존)
vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => false),
  },
}));

// Mock scss-compiler — dart-sass 외부 의존성
const mockCompileScssFile = vi.fn<(filePath: string, loadPaths: string[]) => { css: string; dependencies: string[] }>()
  .mockReturnValue({ css: "/* compiled */", dependencies: [] });

vi.mock("../../src/angular/scss-compiler", () => ({
  compileScssFile: (filePath: string, loadPaths: string[]) => mockCompileScssFile(filePath, loadPaths),
  compileScssString: vi.fn(() => ({ css: "", dependencies: [] })),
}));

const { writeEmitResults, compileSideEffectScss } = await import("../../src/angular/ngtsc-build-core");

beforeEach(() => {
  vi.clearAllMocks();
  mockCompileScssFile.mockReturnValue({ css: "/* compiled */", dependencies: [] as string[] });
});

describe("writeEmitResults — registryReverseIndex", () => {
  // 테스트용 경로 헬퍼
  const pkgDir = path.resolve("/test-pkg");
  const srcFile = path.resolve(pkgDir, "src", "comp.ts");
  const distDir = path.resolve(pkgDir, "dist");

  function makeEmitResult(jsContent: string, sourceFileName?: string) {
    // createOutputPathRewriter는 dist/ 하위 파일만 처리하므로 dist/ 경로로 생성
    return {
      filename: path.resolve(distDir, "comp.js"),
      contents: jsContent,
      sourceFileName,
    };
  }

  // Acceptance: registryReverseIndex가 제공되면 O(1) 삭제를 수행한다
  it("deletes registry entries using reverseIndex and cleans up reverseIndex", () => {
    const oldScssPath = path.resolve(pkgDir, "src", "old.scss");
    const registry = new Map<string, SideEffectScssEntry>([
      [oldScssPath, { scssAbsPath: oldScssPath, cssAbsPath: "/out/old.css", sourceFileName: srcFile }],
    ]);
    const registryReverseIndex = new Map<string, Set<string>>([
      [srcFile, new Set([oldScssPath])],
    ]);
    const scss: SideEffectScssOptions = {
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
      registry,
      registryReverseIndex,
    };

    // SCSS import 없는 JS → 삭제만 발생, 등록 없음
    writeEmitResults([makeEmitResult("export class Comp {}", srcFile)], pkgDir, scss);

    expect(registry.has(oldScssPath)).toBe(false);
    expect(registryReverseIndex.has(srcFile)).toBe(false);
  });

  // Acceptance: 삭제 후 새 SCSS import가 있으면 등록하고 reverseIndex도 갱신
  it("registers new entries and updates reverseIndex after deletion", () => {
    const oldScssPath = path.resolve(pkgDir, "src", "old.scss");
    const registry = new Map<string, SideEffectScssEntry>([
      [oldScssPath, { scssAbsPath: oldScssPath, cssAbsPath: "/out/old.css", sourceFileName: srcFile }],
    ]);
    const registryReverseIndex = new Map<string, Set<string>>([
      [srcFile, new Set([oldScssPath])],
    ]);
    const scss: SideEffectScssOptions = {
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
      registry,
      registryReverseIndex,
    };

    // JS with SCSS import → 삭제 + 등록
    const jsContent = 'import "./button.scss";\nexport class Comp {}';
    writeEmitResults([makeEmitResult(jsContent, srcFile)], pkgDir, scss);

    // old.scss 삭제됨
    expect(registry.has(oldScssPath)).toBe(false);
    // button.scss가 등록됨 (scssAbsPath = path.resolve(srcDir, "./button.scss"))
    const expectedScssPath = path.resolve(pkgDir, "src", "button.scss");
    expect(registry.has(expectedScssPath)).toBe(true);
    // reverseIndex에 새 항목 반영
    expect(registryReverseIndex.get(srcFile)).toEqual(new Set([expectedScssPath]));
  });

  // Acceptance: reverseIndex에 없는 sourceFileName이면 삭제 없음
  it("does not delete when sourceFileName is not in reverseIndex", () => {
    const otherScssPath = path.resolve(pkgDir, "src", "other.scss");
    const otherSrcFile = path.resolve(pkgDir, "src", "other.ts");
    const registry = new Map<string, SideEffectScssEntry>([
      [otherScssPath, { scssAbsPath: otherScssPath, cssAbsPath: "/out/other.css", sourceFileName: otherSrcFile }],
    ]);
    const registryReverseIndex = new Map<string, Set<string>>([
      [otherSrcFile, new Set([otherScssPath])],
    ]);
    const scss: SideEffectScssOptions = {
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
      registry,
      registryReverseIndex,
    };

    // srcFile (comp.ts)에 대한 emit → other.ts의 항목은 건드리지 않음
    writeEmitResults([makeEmitResult("export class Comp {}", srcFile)], pkgDir, scss);

    expect(registry.has(otherScssPath)).toBe(true);
    expect(registryReverseIndex.has(otherSrcFile)).toBe(true);
  });
});

describe("compileSideEffectScss — incremental compilation", () => {
  function makeEntry(scssAbsPath: string, sourceFileName: string): SideEffectScssEntry {
    return {
      scssAbsPath,
      cssAbsPath: scssAbsPath.replace(/\.scss$/, ".css"),
      sourceFileName,
    };
  }

  // Acceptance: changedScssFiles 미제공 시 전체 재컴파일
  it("compiles all entries when changedScssFiles is not provided", () => {
    const registry = new Map<string, SideEffectScssEntry>([
      ["/src/button.scss", makeEntry("/src/button.scss", "/src/comp.ts")],
      ["/src/dialog.scss", makeEntry("/src/dialog.scss", "/src/comp.ts")],
      ["/src/card.scss", makeEntry("/src/card.scss", "/src/other.ts")],
    ]);

    compileSideEffectScss(registry, [], [], new Map());

    expect(mockCompileScssFile).toHaveBeenCalledTimes(3);
  });

  // Acceptance: 변경된 SCSS 파일만 재컴파일 (직접 히트)
  it("only compiles entries whose scssAbsPath is in changedScssFiles", () => {
    const registry = new Map<string, SideEffectScssEntry>([
      ["/src/button.scss", makeEntry("/src/button.scss", "/src/comp.ts")],
      ["/src/dialog.scss", makeEntry("/src/dialog.scss", "/src/other.ts")],
    ]);
    const changedScssFiles = new Set(["/src/button.scss"]);
    const sideEffectScssDeps = new Map<string, Set<string>>();

    compileSideEffectScss(registry, [], [], new Map(), changedScssFiles, sideEffectScssDeps);

    expect(mockCompileScssFile).toHaveBeenCalledTimes(1);
    expect(mockCompileScssFile).toHaveBeenCalledWith("/src/button.scss", []);
  });

  // Acceptance: 의존성이 변경된 SCSS도 재컴파일
  it("recompiles entries whose dependency is in changedScssFiles", () => {
    const registry = new Map<string, SideEffectScssEntry>([
      ["/src/button.scss", makeEntry("/src/button.scss", "/src/comp.ts")],
    ]);
    const changedScssFiles = new Set(["/src/shared.scss"]);
    // button.scss의 이전 컴파일에서 shared.scss가 의존성이었음
    const sideEffectScssDeps = new Map<string, Set<string>>([
      ["/src/button.scss", new Set(["/src/shared.scss"])],
    ]);

    compileSideEffectScss(registry, [], [], new Map(), changedScssFiles, sideEffectScssDeps);

    expect(mockCompileScssFile).toHaveBeenCalledTimes(1);
    expect(mockCompileScssFile).toHaveBeenCalledWith("/src/button.scss", []);
  });

  // Acceptance: 영향받지 않는 항목은 건너뜀
  it("skips entries not affected by changedScssFiles", () => {
    const registry = new Map<string, SideEffectScssEntry>([
      ["/src/button.scss", makeEntry("/src/button.scss", "/src/comp.ts")],
      ["/src/dialog.scss", makeEntry("/src/dialog.scss", "/src/other.ts")],
    ]);
    const changedScssFiles = new Set(["/src/shared.scss"]);
    const sideEffectScssDeps = new Map<string, Set<string>>([
      ["/src/button.scss", new Set(["/src/shared.scss"])],
      ["/src/dialog.scss", new Set(["/src/theme.scss"])],
    ]);

    compileSideEffectScss(registry, [], [], new Map(), changedScssFiles, sideEffectScssDeps);

    // button.scss만 재컴파일 (shared.scss가 의존성), dialog.scss는 건너뜀
    expect(mockCompileScssFile).toHaveBeenCalledTimes(1);
    expect(mockCompileScssFile).toHaveBeenCalledWith("/src/button.scss", []);
  });

  // Unit: 컴파일 후 sideEffectScssDeps가 갱신됨
  it("updates sideEffectScssDeps after compilation", () => {
    const registry = new Map<string, SideEffectScssEntry>([
      ["/src/button.scss", makeEntry("/src/button.scss", "/src/comp.ts")],
    ]);
    mockCompileScssFile.mockReturnValue({ css: "/* ok */", dependencies: ["/src/new-dep.scss"] });
    const sideEffectScssDeps = new Map<string, Set<string>>();

    compileSideEffectScss(registry, [], [], new Map(), undefined, sideEffectScssDeps);

    expect(sideEffectScssDeps.get("/src/button.scss")).toEqual(new Set(["/src/new-dep.scss"]));
  });
});
