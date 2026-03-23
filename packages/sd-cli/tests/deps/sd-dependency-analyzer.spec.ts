import { beforeEach, describe, expect, it } from "vitest";
import * as ts from "typescript";
import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { SdDepCache } from "../../src/ts-compiler/SdDepCache";
import { SdDepAnalyzer } from "../../src/ts-compiler/SdDepAnalyzer";
import { ScopePathSet } from "../../src/ts-compiler/ScopePathSet";

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
  const moduleResolutionCache = ts.createModuleResolutionCache(
    compilerHost.getCurrentDirectory(),
    (x) => x,
  );
  compilerHost.getModuleResolutionCache = () => moduleResolutionCache;
  const program = ts.createProgram(fileNames, {}, compilerHost);
  return { program, compilerHost };
}

function norm(path: string): TNormPath {
  return PathUtils.norm(path);
}

function getAffectedFileSet(depCache: SdDepCache, modifiedSet: Set<TNormPath>): Set<TNormPath> {
  const map = depCache.getAffectedFileMap(modifiedSet);
  const result = new Set<TNormPath>();
  for (const set of map.values()) {
    for (const p of set) result.add(p);
  }
  return result;
}

function createCache(dep: SdDepCache) {
  return {
    dep,
    type: new WeakMap<ts.Node, ts.Type | undefined>(),
    prop: new WeakMap<ts.Type, Map<string, ts.Symbol | undefined>>(),
    declFiles: new WeakMap<ts.Symbol, TNormPath[]>(),
    ngOrg: new Map<TNormPath, ts.SourceFile>(),
  };
}

describe("DependencyAnalyzer", () => {
  const scopePathSet = new ScopePathSet([PathUtils.norm("/")]);
  let depCache: SdDepCache;

  beforeEach(() => {
    depCache = new SdDepCache();
  });

  it("1레벨 의존성 추적", () => {
    const files = {
      "/a.ts": `export const A = 1;`,
      "/b.ts": `import { A } from "./a";`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDepAnalyzer.analyze(program, compilerHost, scopePathSet, createCache(depCache));

    const result = getAffectedFileSet(depCache, new Set([norm("/a.ts")]));
    expect(result).toEqual(new Set([norm("/a.ts"), norm("/b.ts")]));
  });

  it("2레벨 의존성 추적", () => {
    const files = {
      "/a.ts": `export const A = 1;`,
      "/b.ts": `export * from "./a";`,
      "/c.ts": `import { A } from "./b";`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDepAnalyzer.analyze(program, compilerHost, scopePathSet, createCache(depCache));

    {
      const result = getAffectedFileSet(depCache, new Set([norm("/a.ts")]));
      expect(result).toEqual(
        new Set([norm("/a.ts"), norm("/b.ts"), norm("/c.ts")]),
      );
    }

    {
      const result = getAffectedFileSet(depCache, new Set([norm("/b.ts")]));
      expect(result).toEqual(new Set([norm("/b.ts"), norm("/c.ts")]));
    }
  });

  it("2레벨 Rename 의존성 추적", () => {
    const files = {
      "/a.ts": `export const A = 1;`,
      "/b.ts": `export { A as B } from "./a";`,
      "/c.ts": `import { B } from "./b";`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDepAnalyzer.analyze(program, compilerHost, scopePathSet, createCache(depCache));

    {
      const result = getAffectedFileSet(depCache, new Set([norm("/a.ts")]));
      expect(result).toEqual(
        new Set([norm("/a.ts"), norm("/b.ts"), norm("/c.ts")]),
      );
    }

    {
      const result = getAffectedFileSet(depCache, new Set([norm("/b.ts")]));
      expect(result).toEqual(new Set([norm("/b.ts"), norm("/c.ts")]));
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
    SdDepAnalyzer.analyze(program, compilerHost, scopePathSet, createCache(depCache));

    {
      const result = getAffectedFileSet(depCache, new Set([norm("/a.ts")]));
      expect(result).toEqual(new Set([norm("/a.ts"), norm("/b.ts"), norm("/c.ts")]));
    }

    {
      const result = getAffectedFileSet(depCache, new Set([norm("/a_1.ts")]));
      expect(result).toEqual(new Set([norm("/a_1.ts"), norm("/b.ts")]));
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
          console.log(new A().b.c);
        }
      `,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDepAnalyzer.analyze(program, compilerHost, scopePathSet, createCache(depCache));

    const result = getAffectedFileSet(depCache, new Set([norm("/b.ts")]));
    expect(result).toEqual(new Set([norm("/a.ts"), norm("/b.ts"), norm("/c.ts")]));
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
          console.log(new A()['b'].c);
        }
      `,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDepAnalyzer.analyze(program, compilerHost, scopePathSet, createCache(depCache));

    const result = getAffectedFileSet(depCache, new Set([norm("/b.ts")]));
    expect(result).toEqual(new Set([norm("/a.ts"), norm("/b.ts"), norm("/c.ts")]));
  });

  it("타입만 사용하는 경우에도 의존성으로 추적된다", () => {
    const files = {
      "/a.ts": `export interface IA { value: string; }`,
      "/b.ts": `import { IA } from "./a"; const val: IA = { value: "hi" };`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDepAnalyzer.analyze(program, compilerHost, scopePathSet, createCache(depCache));

    const result = getAffectedFileSet(depCache, new Set([norm("/a.ts")]));
    expect(result).toEqual(new Set([norm("/a.ts"), norm("/b.ts")]));
  });

  it("함수 반환 타입을 통한 간접 의존성도 추적된다", () => {
    const files = {
      "/a.ts": `export class A { value = 1; }`,
      "/b.ts": `import { A } from "./a"; export function getA(): A { return new A(); }`,
      "/c.ts": `import { getA } from "./b"; console.log(getA().value);`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDepAnalyzer.analyze(program, compilerHost, scopePathSet, createCache(depCache));

    const result = getAffectedFileSet(depCache, new Set([norm("/a.ts")]));
    expect(result).toEqual(new Set([norm("/a.ts"), norm("/b.ts"), norm("/c.ts")]));
  });

  it("optional chaining으로 접근해도 의존성은 추적된다", () => {
    const files = {
      "/a.ts": `export class A { b?: { c: number }; }`,
      "/b.ts": `import { A } from "./a"; const a = new A(); console.log(a.b?.c);`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDepAnalyzer.analyze(program, compilerHost, scopePathSet, createCache(depCache));

    const result = getAffectedFileSet(depCache, new Set([norm("/a.ts")]));
    expect(result).toEqual(new Set([norm("/a.ts"), norm("/b.ts")]));
  });

  it("invalidates()는 해당 파일의 자체 분석 데이터를 제거한다", () => {
    const files = {
      "/a.ts": `export const A = 1;`,
      "/b.ts": `import { A } from "./a";`,
      "/c.ts": `import { A } from "./a";`,
    };

    const { program, compilerHost } = createMockProgram(files);
    SdDepAnalyzer.analyze(program, compilerHost, scopePathSet, createCache(depCache));

    depCache.invalidates(new Set([norm("/a.ts")]));

    // a의 자체 분석 데이터가 제거됨 (재분석 필요 상태)
    expect(depCache["_exportCache"].has(norm("/a.ts"))).toBe(false);
    expect(depCache["_collectedCache"].has(norm("/a.ts"))).toBe(false);
  });
});
