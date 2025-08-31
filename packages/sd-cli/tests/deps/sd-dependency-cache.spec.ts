import "@simplysm/sd-core-common";
import { PathUtils } from "@simplysm/sd-core-node";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ISdAffectedFileTreeNode,
  SdDependencyCache,
} from "../../src/ts-compiler/sd-dependency-cache";

describe("SdDependencyCache", () => {
  const a = PathUtils.norm("/a.ts");
  const b = PathUtils.norm("/b.ts");
  const c = PathUtils.norm("/c.ts");
  const html = PathUtils.norm("/comp.html");
  // const style = PathUtils.norm("/style.scss");

  let depCache: SdDependencyCache;

  beforeEach(() => {
    depCache = new SdDependencyCache();
  });

  it("export * from 구문으로 재export된 심볼이 정확히 전파된다", () => {
    // a.ts → export const A
    depCache.addExport(a, "A");

    // b.ts → export * from './a.ts'
    depCache.addReexport(b, a, 0);

    // c.ts → import { A } from './b.ts'
    depCache.addImport(c, b, "A");

    const result = depCache.getAffectedFileSet(new Set([a]));
    expect(result).toEqual(new Set([a, b, c]));
  });

  it("export { A as B } from 구문으로 이름이 바뀐 심볼도 추적된다", () => {
    // a.ts → export const A
    depCache.addExport(a, "A");

    // b.ts → export { A as B } from './a.ts'
    depCache.addReexport(b, a, {
      importSymbol: "A",
      exportSymbol: "B",
    });

    // c.ts → import { B } from './b.ts'
    depCache.addImport(c, b, "B");

    const result = depCache.getAffectedFileSet(new Set([a]));
    expect(result).toEqual(new Set([a, b, c]));
  });

  it("import { X } 구문은 정확히 사용한 심볼만 추적한다", () => {
    // b.ts → export const Foo
    depCache.addExport(b, "Foo");

    // a.ts → import { Foo } from './b.ts'
    depCache.addImport(a, b, "Foo");

    const result = depCache.getAffectedFileSet(new Set([b]));
    expect(result).toEqual(new Set([b, a]));
  });

  it("import * (namespace import)은 모든 export의 영향을 받는다", () => {
    // b.ts → export const Bar
    depCache.addExport(b, "Bar");

    // a.ts → import * as B from './b.ts'
    depCache.addImport(a, b, 0);

    const result = depCache.getAffectedFileSet(new Set([b]));
    expect(result).toEqual(new Set([b, a]));
  });

  it("심볼이 일치하지 않으면 영향이 전파되지 않는다", () => {
    // b.ts → export const Foo
    depCache.addExport(b, "Foo");

    // a.ts → import { NotFoo } from './b.ts'
    depCache.addImport(a, b, "NotFoo");

    const result = depCache.getAffectedFileSet(new Set([b]));
    expect(result).toEqual(new Set([b])); // a.ts는 영향 없음
  });

  it("리소스 의존은 역의존만 추적되고 심볼 전파는 없다", () => {
    // a.ts → templateUrl: "comp.html"
    depCache.addImport(a, html, 0);

    const result = depCache.getAffectedFileSet(new Set([html]));
    expect(result).toEqual(new Set([html, a])); // 단순 역참조만 전파
  });

  it("reexport 후 재import된 경로의 역의존도 정확히 추적된다", () => {
    depCache.addExport(a, "X");
    depCache.addReexport(b, a, { importSymbol: "X", exportSymbol: "Y" });
    depCache.addImport(c, b, "Y");

    const result = depCache.getAffectedFileSet(new Set([a]));
    expect(result).toEqual(new Set([a, b, c]));
  });

  it("invalidates()는 캐시에서 모든 관련 정보를 제거한다", () => {
    depCache.addExport(a, "X");
    depCache.addImport(b, a, "X");

    depCache.invalidates(new Set([a]));

    // 내부 캐시 확인
    expect(depCache["_exportCache"].has(a)).toBe(false);
    expect(depCache["#revDepCache"].get(a)?.has(b)).toBeFalsy(); // unefined
  });

  it("getAffectedFileTree()는 영향도를 트리 형태로 표현한다", () => {
    // a.ts → export A
    depCache.addExport(a, "A");

    // b.ts → export { A as B } from './a.ts'
    depCache.addReexport(b, a, {
      importSymbol: "A",
      exportSymbol: "B",
    });

    // c.ts → import { B } from './b.ts'
    depCache.addImport(c, b, "B");

    const trees = depCache.getAffectedFileTree(new Set([a]));

    expect(trees.length).toBeGreaterThan(0);
    const aNode = trees.find((t) => t.fileNPath === a)!;
    expect(aNode.children.some((c1) => c1.fileNPath === b)).toBeTruthy();
    const bNode = aNode.children.find((c1) => c1.fileNPath === b)!;
    expect(bNode.children.some((c2) => c2.fileNPath === c)).toBeTruthy();

    const printTree = (node: ISdAffectedFileTreeNode, indent = "") => {
      console.log(indent + node.fileNPath);
      for (const child of node.children) {
        printTree(child, indent + "  ");
      }
    };

    console.log(printTree(trees[0]));
  });

  it("d.ts를 입력하면 js도 함께 영향을 받는다", () => {
    const dts = PathUtils.norm("/mod.d.ts");
    const js = PathUtils.norm("/mod.js");
    const consumer = PathUtils.norm("/consumer.ts");

    depCache.addExport(dts, "Foo");
    depCache.addImport(consumer, js, "Foo"); // js 경로로 import

    const result = depCache.getAffectedFileSet(new Set([dts]));
    expect(result).toEqual(new Set([dts, js, consumer]));
  });
});
