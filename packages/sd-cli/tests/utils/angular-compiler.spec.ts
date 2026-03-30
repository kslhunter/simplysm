import { describe, it, expect, vi } from "vitest";
import ts from "typescript";

// --- Unit Tests: Slice 1 — AngularSourceFileCache ---

describe("AngularSourceFileCache — Unit Tests", () => {
  it("modifiedFiles는 빈 Set으로 초기화된다", async () => {
    const { AngularSourceFileCache } = await import(
      "../../src/utils/angular-compiler"
    );
    const cache = new AngularSourceFileCache();
    expect(cache.modifiedFiles).toBeInstanceOf(Set);
    expect(cache.modifiedFiles.size).toBe(0);
  });

  it("invalidate는 여러 파일을 한번에 처리한다", async () => {
    const { AngularSourceFileCache } = await import(
      "../../src/utils/angular-compiler"
    );
    const cache = new AngularSourceFileCache();
    const sf1 = ts.createSourceFile("a.ts", "", ts.ScriptTarget.ESNext);
    const sf2 = ts.createSourceFile("b.ts", "", ts.ScriptTarget.ESNext);
    cache.set("src/a.ts", sf1);
    cache.set("src/b.ts", sf2);

    cache.invalidate(["src/a.ts", "src/b.ts"]);

    expect(cache.has("src/a.ts")).toBe(false);
    expect(cache.has("src/b.ts")).toBe(false);
    expect(cache.modifiedFiles.has("src/a.ts")).toBe(true);
    expect(cache.modifiedFiles.has("src/b.ts")).toBe(true);
  });

  it("augmentHostWithCaching — 캐시 미스 시 원본 호출 후 캐시 저장", async () => {
    const { AngularSourceFileCache, augmentHostWithCaching } = await import(
      "../../src/utils/angular-compiler"
    );

    const cache = new AngularSourceFileCache();
    const fakeSourceFile = ts.createSourceFile(
      "miss.ts",
      "const y = 2;",
      ts.ScriptTarget.ESNext,
    );

    const mockGetSourceFile = vi.fn().mockReturnValue(fakeSourceFile);
    const host = { getSourceFile: mockGetSourceFile } as unknown as ts.CompilerHost;

    augmentHostWithCaching(host, cache);

    // shouldCreateNewSourceFile = false, 캐시에 없음 → 원본 호출
    const result = host.getSourceFile("miss.ts", ts.ScriptTarget.ESNext, undefined, false);
    expect(result).toBe(fakeSourceFile);
    expect(mockGetSourceFile).toHaveBeenCalled();
    // 캐시에 저장되었는지 확인
    expect(cache.get("miss.ts")).toBe(fakeSourceFile);
  });

  it("augmentHostWithCaching — shouldCreateNewSourceFile=true이면 캐시 무시", async () => {
    const { AngularSourceFileCache, augmentHostWithCaching } = await import(
      "../../src/utils/angular-compiler"
    );

    const cache = new AngularSourceFileCache();
    const cachedFile = ts.createSourceFile("cached.ts", "old", ts.ScriptTarget.ESNext);
    const freshFile = ts.createSourceFile("cached.ts", "new", ts.ScriptTarget.ESNext);
    cache.set("cached.ts", cachedFile);

    const mockGetSourceFile = vi.fn().mockReturnValue(freshFile);
    const host = { getSourceFile: mockGetSourceFile } as unknown as ts.CompilerHost;

    augmentHostWithCaching(host, cache);

    const result = host.getSourceFile("cached.ts", ts.ScriptTarget.ESNext, undefined, true);
    expect(result).toBe(freshFile);
    expect(mockGetSourceFile).toHaveBeenCalled();
    // 새 파일이 캐시에 저장됨
    expect(cache.get("cached.ts")).toBe(freshFile);
  });
});

// --- Acceptance Tests: Slice 1 — AngularSourceFileCache ---

describe("AngularSourceFileCache", () => {
  // Scenario: SourceFileCache 통합
  describe("augmentHostWithCaching으로 호스트에 캐시를 통합한다", () => {
    it("캐시에 있는 파일은 재파싱 없이 반환되고, 미스 시 원본 호출 후 캐시 저장", async () => {
      const { AngularSourceFileCache, augmentHostWithCaching } = await import(
        "../../src/utils/angular-compiler"
      );

      const cache = new AngularSourceFileCache();
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
      };
      const host = ts.createCompilerHost(compilerOptions);

      const originalGetSourceFile = vi.fn(host.getSourceFile.bind(host));
      host.getSourceFile = originalGetSourceFile;

      augmentHostWithCaching(host, cache);

      // 첫 호출: 캐시 미스 → 원본 호출 → 캐시 저장
      const fakeFileName = "test-file.ts";
      const fakeSourceFile = ts.createSourceFile(
        fakeFileName,
        "const x = 1;",
        ts.ScriptTarget.ESNext,
      );
      cache.set(fakeFileName, fakeSourceFile);

      // shouldCreateNewSourceFile = false → 캐시에서 반환
      const result = host.getSourceFile(
        fakeFileName,
        ts.ScriptTarget.ESNext,
        undefined,
        false,
      );
      expect(result).toBe(fakeSourceFile);
      // 캐시 히트이므로 원본 getSourceFile은 호출되지 않아야 한다
      expect(originalGetSourceFile).not.toHaveBeenCalled();
    });
  });

  // Scenario: SourceFileCache invalidate
  describe("invalidate로 파일을 캐시에서 삭제하고 modifiedFiles에 추가한다", () => {
    it("invalidate 후 캐시에서 삭제되고 modifiedFiles에 추가된다", async () => {
      const { AngularSourceFileCache } = await import(
        "../../src/utils/angular-compiler"
      );

      const cache = new AngularSourceFileCache();
      const fakeSourceFile = ts.createSourceFile(
        "component.ts",
        "class Comp {}",
        ts.ScriptTarget.ESNext,
      );

      // normalize: backslash → forward slash
      const pathWithBackslash = "src\\app\\component.ts";
      const normalizedPath = "src/app/component.ts";
      cache.set(normalizedPath, fakeSourceFile);

      cache.invalidate([pathWithBackslash]);

      expect(cache.has(normalizedPath)).toBe(false);
      expect(cache.modifiedFiles.has(normalizedPath)).toBe(true);
    });
  });
});
