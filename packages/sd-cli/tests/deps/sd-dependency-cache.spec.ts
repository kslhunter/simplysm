import "@simplysm/sd-core-common";
import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { beforeEach, describe, expect, it } from "vitest";
import { SdDepCache } from "../../src/ts-compiler/SdDepCache";

function getAffectedFileSet(depCache: SdDepCache, modifiedSet: Set<TNormPath>): Set<TNormPath> {
  const map = depCache.getAffectedFileMap(modifiedSet);
  const result = new Set<TNormPath>();
  for (const set of map.values()) {
    for (const p of set) result.add(p);
  }
  return result;
}

describe("SdDependencyCache", () => {
  const a = PathUtils.norm("/a.ts");
  const b = PathUtils.norm("/b.ts");
  const c = PathUtils.norm("/c.ts");
  const html = PathUtils.norm("/comp.html");

  let depCache: SdDepCache;

  beforeEach(() => {
    depCache = new SdDepCache();
  });

  it("export * from 구문으로 재export된 심볼이 정확히 전파된다", () => {
    depCache.addExport(a, "A");
    depCache.addReexport(b, a, 0);
    depCache.addImport(c, b, "A");

    const result = getAffectedFileSet(depCache, new Set([a]));
    expect(result).toEqual(new Set([a, b, c]));
  });

  it("export { A as B } from 구문으로 이름이 바뀐 심볼도 추적된다", () => {
    depCache.addExport(a, "A");
    depCache.addReexport(b, a, {
      importSymbol: "A",
      exportSymbol: "B",
    });
    depCache.addImport(c, b, "B");

    const result = getAffectedFileSet(depCache, new Set([a]));
    expect(result).toEqual(new Set([a, b, c]));
  });

  it("import { X } 구문은 정확히 사용한 심볼만 추적한다", () => {
    depCache.addExport(b, "Foo");
    depCache.addImport(a, b, "Foo");

    const result = getAffectedFileSet(depCache, new Set([b]));
    expect(result).toEqual(new Set([b, a]));
  });

  it("import * (namespace import)은 모든 export의 영향을 받는다", () => {
    depCache.addExport(b, "Bar");
    depCache.addImport(a, b, 0);

    const result = getAffectedFileSet(depCache, new Set([b]));
    expect(result).toEqual(new Set([b, a]));
  });

  it("심볼이 일치하지 않으면 영향이 전파되지 않는다", () => {
    depCache.addExport(b, "Foo");
    depCache.addImport(a, b, "NotFoo");

    const result = getAffectedFileSet(depCache, new Set([b]));
    expect(result).toEqual(new Set([b]));
  });

  it("리소스 의존은 역의존만 추적되고 심볼 전파는 없다", () => {
    depCache.addImport(a, html, 0);

    const result = getAffectedFileSet(depCache, new Set([html]));
    expect(result).toEqual(new Set([html, a]));
  });

  it("reexport 후 재import된 경로의 역의존도 정확히 추적된다", () => {
    depCache.addExport(a, "X");
    depCache.addReexport(b, a, { importSymbol: "X", exportSymbol: "Y" });
    depCache.addImport(c, b, "Y");

    const result = getAffectedFileSet(depCache, new Set([a]));
    expect(result).toEqual(new Set([a, b, c]));
  });

  it("invalidates()는 해당 파일의 자체 분석 데이터를 제거한다", () => {
    depCache.addExport(a, "X");
    depCache.addImport(b, a, "X");

    depCache.invalidates(new Set([a]));

    // a의 자체 export/import/collected 캐시가 제거됨
    expect(depCache["_exportCache"].has(a)).toBe(false);
    expect(depCache["_importCache"].has(a)).toBe(false);
    expect(depCache["_collectedCache"].has(a)).toBe(false);
  });

  it("d.ts를 입력하면 js도 함께 영향을 받는다", () => {
    const dts = PathUtils.norm("/mod.d.ts");
    const js = PathUtils.norm("/mod.js");
    const consumer = PathUtils.norm("/consumer.ts");

    depCache.addExport(dts, "Foo");
    depCache.addImport(consumer, js, "Foo");

    const result = getAffectedFileSet(depCache, new Set([dts]));
    expect(result).toEqual(new Set([dts, js, consumer]));
  });
});
