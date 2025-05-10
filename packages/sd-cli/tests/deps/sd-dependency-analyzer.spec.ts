import { beforeEach, describe, expect, it } from "vitest";
import * as ts from "typescript";
import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { SdDependencyCache } from "../../src/ts-compiler/sd-dependency-cache";
import { SdDependencyAnalyzer } from "../../src/ts-compiler/sd-dependency-analyzer";

function createMockProgram(sources: Record<string, string>) {
  const fileNames = Object.keys(sources);
  const compilerHost = ts.createCompilerHost({});
  compilerHost.readFile = (fileName: string) => sources[fileName] ?? "";
  compilerHost.fileExists = (fileName: string) => fileName in sources;
  compilerHost.getSourceFile = (fileName, languageVersion) => {
    const sourceText = sources[fileName];
    if (!sourceText) return undefined;
    return ts.createSourceFile(fileName, sourceText, languageVersion);
  };
  const program = ts.createProgram(fileNames, {}, compilerHost);
  return { program, compilerHost };
}

function norm(path: string): TNormPath {
  return PathUtils.norm(path);
}

describe("DependencyAnalyzer", () => {
  const scope = PathUtils.norm("/");
  let depCache: SdDependencyCache;

  beforeEach(() => {
    depCache = new SdDependencyCache();
  });

  it("1레벨 의존성 추적", () => {
    const files = {
      "/a.ts": `export const A = 1;`,
      "/b.ts": `import { A } from "./a";`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDependencyAnalyzer.analyze(program, compilerHost, [scope], depCache);

    const result = depCache.getAffectedFileSet(new Set([norm("/a.ts")]));
    expect(result).toEqual(new Set([
      norm("/a.ts"),
      norm("/b.ts"),
    ]));
  });

  it("2레벨 의존성 추적", () => {
    const files = {
      "/a.ts": `export const A = 1;`,
      "/b.ts": `export * from "./a";`,
      "/c.ts": `import { A } from "./b";`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDependencyAnalyzer.analyze(program, compilerHost, [scope], depCache);

    {
      const result = depCache.getAffectedFileSet(new Set([norm("/a.ts")]));
      expect(result).toEqual(new Set([
        norm("/a.ts"),
        norm("/b.ts"), // a파일이 사라지거나 하면 b가 오류를 뱉어야 하므로
        norm("/c.ts"),
      ]));
    }

    {
      const result = depCache.getAffectedFileSet(new Set([norm("/b.ts")]));
      expect(result).toEqual(new Set([
        norm("/b.ts"),
        norm("/c.ts"),
      ]));
    }
  });

  it("2레벨 Rename 의존성 추적", () => {
    const files = {
      "/a.ts": `export const A = 1;`,
      "/b.ts": `export { A as B } from "./a";`,
      "/c.ts": `import { B } from "./b";`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDependencyAnalyzer.analyze(program, compilerHost, [scope], depCache);

    {
      const result = depCache.getAffectedFileSet(new Set([norm("/a.ts")]));
      expect(result).toEqual(new Set([
        norm("/a.ts"),
        norm("/b.ts"), // a파일이 사라지거나 하면 b가 오류를 뱉어야 하므로
        norm("/c.ts"),
      ]));
    }

    {
      const result = depCache.getAffectedFileSet(new Set([norm("/b.ts")]));
      expect(result).toEqual(new Set([
        norm("/b.ts"),
        norm("/c.ts"),
      ]));
    }
  });

  it("2레벨 선택적 의존성 추적", () => {
    const files = {
      "/a.ts": `export const A = 1;`,
      "/a_1.ts": `export const A_1 = 1;`,
      "/b.ts": `export * from "./a"; export * from "./a_1";`,
      "/c.ts": `import { A } from "./b";`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDependencyAnalyzer.analyze(program, compilerHost, [scope], depCache);

    {
      const result = depCache.getAffectedFileSet(new Set([norm("/a.ts")]));
      expect(result).toEqual(new Set([
        norm("/a.ts"),
        norm("/b.ts"),
        norm("/c.ts"),
      ]));
    }

    {
      const result = depCache.getAffectedFileSet(new Set([norm("/a_1.ts")]));
      expect(result).toEqual(new Set([
        norm("/a_1.ts"),
        norm("/b.ts"),
      ]));
    }
  });


  it("A.b.c와같은 간접 의존성 추적", () => {
    const files = {
      "/a.ts": `
        import { B } from "./b";
        export class A {
          b: B = new B();
        }
      `,
      "/b.ts": `
        export class B {
          c: string = "hello";
        }
      `,
      "/c.ts": `
        import { A } from "./a";
        
        function doSomething() {
          // A.b.c 속성 접근을 통해 B에 간접 의존
          console.log(new A().b.c);
        }
      `,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDependencyAnalyzer.analyze(program, compilerHost, [scope], depCache);

    // B가 변경되면 A와 C 모두 영향 받는지 확인
    const result = depCache.getAffectedFileSet(new Set([norm("/b.ts")]));
    expect(result).toEqual(new Set([
      norm("/a.ts"),
      norm("/b.ts"),
      norm("/c.ts"),
    ]));
  });

  it("A['b'].c와같은 Element 간접 의존성 추적", () => {
    const files = {
      "/a.ts": `
        import { B } from "./b";
        export class A {
          b: B = new B();
        }
      `,
      "/b.ts": `
        export class B {
          c: string = "hello";
        }
      `,
      "/c.ts": `
        import { A } from "./a";
        
        function doSomething() {
          // A['b'].c 속성 접근을 통해 B에 간접 의존
          console.log(new A()['b'].c);
        }
      `,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDependencyAnalyzer.analyze(program, compilerHost, [scope], depCache);

    // B가 변경되면 A와 C 모두 영향 받는지 확인
    const result = depCache.getAffectedFileSet(new Set([norm("/b.ts")]));
    expect(result).toEqual(new Set([
      norm("/a.ts"),
      norm("/b.ts"),
      norm("/c.ts"),
    ]));
  });

  it("타입만 사용하는 경우에도 의존성으로 추적된다", () => {
    const files = {
      "/a.ts": `export interface IA { value: string; }`,
      "/b.ts": `import { IA } from "./a"; const val: IA = { value: "hi" };`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDependencyAnalyzer.analyze(program, compilerHost, [scope], depCache);

    const result = depCache.getAffectedFileSet(new Set([norm("/a.ts")]));
    expect(result).toEqual(new Set([
      norm("/a.ts"),
      norm("/b.ts"),
    ]));
  });

  it("함수 반환 타입을 통한 간접 의존성도 추적된다", () => {
    const files = {
      "/a.ts": `export class A { value = 1; }`,
      "/b.ts": `import { A } from "./a"; export function getA(): A { return new A(); }`,
      "/c.ts": `import { getA } from "./b"; console.log(getA().value);`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDependencyAnalyzer.analyze(program, compilerHost, [scope], depCache);

    const result = depCache.getAffectedFileSet(new Set([norm("/a.ts")]));
    expect(result).toEqual(new Set([
      norm("/a.ts"),
      norm("/b.ts"),
      norm("/c.ts"),
    ]));
  });

  it("optional chaining으로 접근해도 의존성은 추적된다", () => {
    const files = {
      "/a.ts": `export class A { b?: { c: number }; }`,
      "/b.ts": `import { A } from "./a"; const a = new A(); console.log(a.b?.c);`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDependencyAnalyzer.analyze(program, compilerHost, [scope], depCache);

    const result = depCache.getAffectedFileSet(new Set([norm("/a.ts")]));
    expect(result).toEqual(new Set([
      norm("/a.ts"),
      norm("/b.ts"),
    ]));
  });

  it("invalidates()는 영향 받은 모든 파일을 캐시에서 제거한다", () => {
    const files = {
      "/a.ts": `export const A = 1;`,
      "/b.ts": `import { A } from "./a";`,
      "/c.ts": `import { A } from "./a";`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDependencyAnalyzer.analyze(program, compilerHost, [scope], depCache);

    // invalidate 처리
    depCache.invalidates(new Set([norm("/a.ts")]));

    const affected = depCache.getAffectedFileSet(new Set([norm("/a.ts")]));
    // 분석 안된 상태이므로, a만 남아야 함
    expect(affected).toEqual(new Set([norm("/a.ts")]));
  });
});
