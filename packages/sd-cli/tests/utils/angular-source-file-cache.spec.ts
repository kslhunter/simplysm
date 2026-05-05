import { describe, it, expect, vi } from "vitest";
import ts from "typescript";
import * as angularBuild from "../../src/angular/angular-build";

// angular-build의 NgtscProgram 클래스 인스턴스화는 실제 Angular 컴파일러 필요 — spy로 차단
vi.spyOn(angularBuild, "NgtscProgram" as any).mockImplementation((() => ({})) as any);

import { AngularSourceFileCache, augmentHostWithCaching } from "../../src/angular/angular-compiler";

// =============================================================================
// AngularSourceFileCache — Unit Tests
// =============================================================================

describe("AngularSourceFileCache — Unit Tests", () => {
  it("modifiedFiles는 빈 Set으로 초기화된다", () => {
    const cache = new AngularSourceFileCache();
    expect(cache.modifiedFiles).toBeInstanceOf(Set);
    expect(cache.modifiedFiles.size).toBe(0);
  });

  it("invalidate는 여러 파일을 한번에 처리한다", () => {
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

  it("augmentHostWithCaching — 캐시 미스 시 원본 호출 후 캐시 저장", () => {
    const cache = new AngularSourceFileCache();
    const fakeSourceFile = ts.createSourceFile(
      "miss.ts",
      "const y = 2;",
      ts.ScriptTarget.ESNext,
    );

    const mockGetSourceFile = vi.fn().mockReturnValue(fakeSourceFile);
    const host = { getSourceFile: mockGetSourceFile } as unknown as ts.CompilerHost;

    augmentHostWithCaching(host, cache);

    const result = host.getSourceFile("miss.ts", ts.ScriptTarget.ESNext, undefined, false);
    expect(result).toBe(fakeSourceFile);
    expect(cache.get("miss.ts")).toBe(fakeSourceFile);
  });

  it("augmentHostWithCaching — shouldCreateNewSourceFile=true이면 캐시 무시", () => {
    const cache = new AngularSourceFileCache();
    const cachedFile = ts.createSourceFile("cached.ts", "old", ts.ScriptTarget.ESNext);
    const freshFile = ts.createSourceFile("cached.ts", "new", ts.ScriptTarget.ESNext);
    cache.set("cached.ts", cachedFile);

    const mockGetSourceFile = vi.fn().mockReturnValue(freshFile);
    const host = { getSourceFile: mockGetSourceFile } as unknown as ts.CompilerHost;

    augmentHostWithCaching(host, cache);

    const result = host.getSourceFile("cached.ts", ts.ScriptTarget.ESNext, undefined, true);
    expect(result).toBe(freshFile);
    expect(cache.get("cached.ts")).toBe(freshFile);
  });
});

// =============================================================================
// AngularSourceFileCache — Integration
// =============================================================================

describe("AngularSourceFileCache", () => {
  describe("augmentHostWithCaching으로 호스트에 캐시를 통합한다", () => {
    it("캐시에 있는 파일은 재파싱 없이 반환되고, 미스 시 원본 호출 후 캐시 저장", () => {
      const cache = new AngularSourceFileCache();
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
      };
      const host = ts.createCompilerHost(compilerOptions);

      const originalGetSourceFile = vi.fn(host.getSourceFile.bind(host));
      host.getSourceFile = originalGetSourceFile;

      augmentHostWithCaching(host, cache);

      const fakeFileName = "test-file.ts";
      const fakeSourceFile = ts.createSourceFile(
        fakeFileName,
        "const x = 1;",
        ts.ScriptTarget.ESNext,
      );
      cache.set(fakeFileName, fakeSourceFile);

      const result = host.getSourceFile(
        fakeFileName,
        ts.ScriptTarget.ESNext,
        undefined,
        false,
      );
      expect(result).toBe(fakeSourceFile);
    });
  });

  describe("invalidate로 파일을 캐시에서 삭제하고 modifiedFiles에 추가한다", () => {
    it("invalidate 후 캐시에서 삭제되고 modifiedFiles에 추가된다", () => {
      const cache = new AngularSourceFileCache();
      const fakeSourceFile = ts.createSourceFile(
        "component.ts",
        "class Comp {}",
        ts.ScriptTarget.ESNext,
      );

      const pathWithBackslash = "src\\app\\component.ts";
      const normalizedPath = "src/app/component.ts";
      cache.set(normalizedPath, fakeSourceFile);

      cache.invalidate([pathWithBackslash]);

      expect(cache.has(normalizedPath)).toBe(false);
      expect(cache.modifiedFiles.has(normalizedPath)).toBe(true);
    });
  });
});
