import { describe, it, expect } from "vitest";
import ts from "typescript";
import { analyzeFileUpdates, collectHmrCandidates } from "../../src/utils/hmr-candidates.js";

function createSourceFile(content: string, fileName = "test.ts"): ts.SourceFile {
  return ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
}

describe("analyzeFileUpdates", () => {
  // Unit: statement 수 불일치 → null
  it("returns null when statement count differs", () => {
    const stale = createSourceFile("const a = 1;");
    const updated = createSourceFile("const a = 1;\nconst b = 2;");

    const result = analyzeFileUpdates(stale, updated);
    expect(result).toBeNull();
  });

  // Unit: 동일 파일 → 빈 Set (변경 없음)
  it("returns empty array when no changes", () => {
    const content = "const a = 1;";
    const stale = createSourceFile(content);
    const updated = createSourceFile(content);

    const result = analyzeFileUpdates(stale, updated);
    expect(result).not.toBeNull();
    expect(result!).toHaveLength(0);
  });

  // Unit: non-class statement 텍스트 변경 → null
  it("returns null when non-class statement text changes", () => {
    const stale = createSourceFile("const a = 1;");
    const updated = createSourceFile("const a = 2;");

    const result = analyzeFileUpdates(stale, updated);
    expect(result).toBeNull();
  });

  // Unit: class name 변경 → null
  it("returns null when class name changes", () => {
    const stale = createSourceFile("class Foo {}");
    const updated = createSourceFile("class Bar {}");

    const result = analyzeFileUpdates(stale, updated);
    expect(result).toBeNull();
  });

  // Unit: class heritage 변경 → null
  it("returns null when class heritage changes", () => {
    const stale = createSourceFile("class Foo {}");
    const updated = createSourceFile("class Foo extends Base {}");

    const result = analyzeFileUpdates(stale, updated);
    expect(result).toBeNull();
  });

  // Unit: class members 변경 (not component) → null
  it("returns null when non-component class members change", () => {
    const stale = createSourceFile("class Foo { x = 1; }");
    const updated = createSourceFile("class Foo { x = 2; }");

    const result = analyzeFileUpdates(stale, updated);
    expect(result).toBeNull();
  });
});

describe("collectHmrCandidates", () => {
  // Unit: stale source file 없으면 빈 Set (전체 무효화)
  it("returns empty set when stale source file is missing", () => {
    const mockCompiler = {
      getComponentsWithTemplateFile: () => new Set(),
      getComponentsWithStyleFile: () => new Set(),
      getCurrentProgram: () => ({
        getSourceFile: () => createSourceFile("const a = 1;"),
      }),
      getMeta: () => null,
    };

    const result = collectHmrCandidates(
      new Set(["unknown.ts"]),
      mockCompiler as any,
      new Map(),
    );

    expect(result.size).toBe(0);
  });

  // Unit: 템플릿 파일 변경 시 컴포넌트 반환
  it("returns components when template file changes", () => {
    const mockNode = {} as ts.ClassDeclaration;
    const mockCompiler = {
      getComponentsWithTemplateFile: (file: string) => {
        if (file === "app.component.html") {
          return new Set([mockNode]);
        }
        return new Set();
      },
      getComponentsWithStyleFile: () => new Set(),
      getCurrentProgram: () => ({ getSourceFile: () => undefined }),
      getMeta: () => null,
    };

    const result = collectHmrCandidates(
      new Set(["app.component.html"]),
      mockCompiler as any,
      new Map(),
    );

    expect(result.size).toBe(1);
    expect(result.has(mockNode)).toBe(true);
  });

  // Unit: 스타일 파일 변경 시 컴포넌트 반환
  it("returns components when style file changes", () => {
    const mockNode = {} as ts.ClassDeclaration;
    const mockCompiler = {
      getComponentsWithTemplateFile: () => new Set(),
      getComponentsWithStyleFile: (file: string) => {
        if (file === "app.component.scss") {
          return new Set([mockNode]);
        }
        return new Set();
      },
      getCurrentProgram: () => ({ getSourceFile: () => undefined }),
      getMeta: () => null,
    };

    const result = collectHmrCandidates(
      new Set(["app.component.scss"]),
      mockCompiler as any,
      new Map(),
    );

    expect(result.size).toBe(1);
    expect(result.has(mockNode)).toBe(true);
  });

  // Unit: current source 없으면 빈 Set (전체 무효화)
  it("returns empty set when current source file is missing", () => {
    const staleSource = createSourceFile("const a = 1;");
    const mockCompiler = {
      getComponentsWithTemplateFile: () => new Set(),
      getComponentsWithStyleFile: () => new Set(),
      getCurrentProgram: () => ({
        getSourceFile: () => undefined,
      }),
      getMeta: () => null,
    };

    const result = collectHmrCandidates(
      new Set(["test.ts"]),
      mockCompiler as any,
      new Map([["test.ts", staleSource]]),
    );

    expect(result.size).toBe(0);
  });
});
