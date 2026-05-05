import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SideEffectScssEntry, SideEffectScssOptions } from "../../src/angular/ngtsc-build-core";
import * as scssCompilerMod from "../../src/angular/scss-compiler";

const mockCompileScssFile = vi.spyOn(scssCompilerMod, "compileScssFile")
  .mockReturnValue({ css: "/* compiled */", dependencies: [] });
vi.spyOn(scssCompilerMod, "compileScssString").mockReturnValue({ css: "", dependencies: [] });

import { writeEmitResults, compileSideEffectScss } from "../../src/angular/ngtsc-build-core";

let tmpRoot: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), "ngtsc-build-core-"));
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

beforeEach(() => {
  vi.clearAllMocks();
  mockCompileScssFile.mockReturnValue({ css: "/* compiled */", dependencies: [] as string[] });
});

describe("writeEmitResults — registryReverseIndex", () => {
  // 테스트용 경로 헬퍼 (실제 fs에 쓰이므로 tmpdir 사용)
  let pkgDir: string;
  let srcFile: string;
  let distDir: string;

  beforeEach(() => {
    pkgDir = path.resolve(tmpRoot, "test-pkg");
    srcFile = path.resolve(pkgDir, "src", "comp.ts");
    distDir = path.resolve(pkgDir, "dist");
  });

  function makeEmitResult(jsContent: string, sourceFileName?: string) {
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
      [oldScssPath, { scssAbsPath: oldScssPath, cssAbsPath: path.join(distDir, "old.css"), sourceFileName: srcFile }],
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
      [oldScssPath, { scssAbsPath: oldScssPath, cssAbsPath: path.join(distDir, "old.css"), sourceFileName: srcFile }],
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
      [otherScssPath, { scssAbsPath: otherScssPath, cssAbsPath: path.join(distDir, "other.css"), sourceFileName: otherSrcFile }],
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
      cssAbsPath: path.join(tmpRoot, scssAbsPath.replace(/\.scss$/, ".css").replace(/[/\\]/g, "_")),
      sourceFileName,
    };
  }

  // Unit: 컴파일 후 sideEffectScssDeps가 갱신됨
  it("updates sideEffectScssDeps after compilation", () => {
    const buttonScss = path.join(tmpRoot, "button.scss");
    const registry = new Map<string, SideEffectScssEntry>([
      [buttonScss, makeEntry(buttonScss, path.join(tmpRoot, "comp.ts"))],
    ]);
    const newDep = path.join(tmpRoot, "new-dep.scss");
    mockCompileScssFile.mockReturnValue({ css: "/* ok */", dependencies: [newDep] });
    const sideEffectScssDeps = new Map<string, Set<string>>();

    compileSideEffectScss(registry, [], [], new Map(), undefined, sideEffectScssDeps);

    expect(sideEffectScssDeps.get(buttonScss)).toEqual(new Set([newDep]));
  });
});
