import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import postcss from "postcss";
import type esbuild from "esbuild";
import { createPostcssPlugin } from "../../src/esbuild/esbuild-postcss-plugin";

// --- Helpers ---

/** PostCSS 플러그인: CSS 앞에 마커 주석을 추가한다 */
function markerPlugin(): postcss.Plugin {
  return {
    postcssPlugin: "test-marker",
    Once(root) {
      root.prepend(new postcss.Comment({ text: "marker" }));
    },
  };
}

/** PostCSS 플러그인: 항상 예외를 발생시킨다 */
function throwingPlugin(): postcss.Plugin {
  return {
    postcssPlugin: "test-throwing",
    Once() {
      throw new Error("postcss-boom");
    },
  };
}

/** esbuild 플러그인에서 onEnd 콜백을 캡처한다 */
function captureOnEnd(
  plugin: esbuild.Plugin,
): (result: esbuild.BuildResult) => Promise<void> | void {
  let cb!: (result: esbuild.BuildResult) => Promise<void> | void;
  void plugin.setup({
    onEnd(fn: (result: esbuild.BuildResult) => Promise<void> | void) {
      cb = fn;
    },
  } as unknown as esbuild.PluginBuild);
  return cb;
}

/** 최소한의 esbuild BuildResult를 생성한다 */
function buildResult(outputs: Record<string, unknown>): esbuild.BuildResult {
  return {
    errors: [] as esbuild.Message[],
    warnings: [] as esbuild.Message[],
    metafile: { inputs: {}, outputs } as esbuild.Metafile,
    outputFiles: [],
    mangleCache: {},
  };
}

// --- Tests ---

describe("createPostcssPlugin — Acceptance", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "postcss-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Scenario: .css 파일에 PostCSS 적용
  it(".css 파일의 내용이 PostCSS 플러그인으로 변환되어 덮어쓰기된다", async () => {
    const cssFile = path.join(tmpDir, "main.css");
    fs.writeFileSync(cssFile, ".host { display: flex; }");

    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    await onEnd(
      buildResult({
        [cssFile]: { bytes: 100, inputs: {}, imports: [], exports: [] },
      }),
    );

    const output = fs.readFileSync(cssFile, "utf-8");
    expect(output).toContain("/* marker */");
    expect(output).toContain("display: flex");
  });

  // Scenario: .css 확장자가 아닌 파일은 CSS 전체 처리 대상에서 제외
  it(".js 파일은 CSS 전체 적용 로직에서 처리되지 않아 원본이 유지된다", async () => {
    const jsFile = path.join(tmpDir, "main.js");
    const original = 'console.log("hello");';
    fs.writeFileSync(jsFile, original);

    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    await onEnd(
      buildResult({
        [jsFile]: { bytes: 100, inputs: {}, imports: [], exports: [] },
      }),
    );

    expect(fs.readFileSync(jsFile, "utf-8")).toBe(original);
  });

  // Scenario: 빈 PostCSS 플러그인 배열로 생성 시 파일 처리 없음
  it("빈 플러그인 배열이면 .css 파일을 읽지도 수정하지도 않는다", async () => {
    const cssFile = path.join(tmpDir, "main.css");
    const original = ".host { display: flex; }";
    fs.writeFileSync(cssFile, original);

    const plugin = createPostcssPlugin({ plugins: [] });
    const onEnd = captureOnEnd(plugin);

    await onEnd(
      buildResult({
        [cssFile]: { bytes: 100, inputs: {}, imports: [], exports: [] },
      }),
    );

    expect(fs.readFileSync(cssFile, "utf-8")).toBe(original);
  });

  // Scenario: .css 파일 PostCSS 적용 실패 시 esbuild error 추가
  it("PostCSS 실패 시 result.errors에 파일 경로와 에러 메시지가 추가된다", async () => {
    const cssFile = path.join(tmpDir, "broken.css");
    fs.writeFileSync(cssFile, ".host { display: flex; }");

    const plugin = createPostcssPlugin({ plugins: [throwingPlugin()] });
    const onEnd = captureOnEnd(plugin);

    const result = buildResult({
      [cssFile]: { bytes: 100, inputs: {}, imports: [], exports: [] },
    });
    await onEnd(result);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].text).toContain("postcss-boom");
    expect(result.errors[0].text).toContain(cssFile);
  });

  // --- Slice 2: .js 파일 AST 기반 inline CSS ---

  // Scenario: ɵɵdefineComponent 내 단일 styles 문자열에 PostCSS 적용
  it("ɵɵdefineComponent 내 styles 문자열에 PostCSS가 적용되어 내용이 변환된다", async () => {
    const jsFile = path.join(tmpDir, "main.js");
    const code = [
      'import * as i0 from "@angular/core";',
      "class MyComp {}",
      "MyComp.ɵcmp = i0.ɵɵdefineComponent({",
      '  styles: [".host { display: flex; }"]',
      "});",
    ].join("\n");
    fs.writeFileSync(jsFile, code);

    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    await onEnd(
      buildResult({
        [jsFile]: { bytes: 200, inputs: {}, imports: [], exports: [] },
      }),
    );

    const output = fs.readFileSync(jsFile, "utf-8");
    expect(output).toContain("/* marker */");
    expect(output).toContain("display: flex");
    // 원본 JS 구조가 유지되어야 한다
    expect(output).toContain("ɵɵdefineComponent");
  });

  // Scenario: ɵɵdefineComponent 내 복수 styles 문자열에 각각 PostCSS 적용
  it("복수 styles 문자열에 각각 독립적으로 PostCSS가 적용된다", async () => {
    const jsFile = path.join(tmpDir, "multi.js");
    const code = [
      'import * as i0 from "@angular/core";',
      "class MyComp {}",
      "MyComp.ɵcmp = i0.ɵɵdefineComponent({",
      '  styles: [".a { color: red; }", ".b { color: blue; }"]',
      "});",
    ].join("\n");
    fs.writeFileSync(jsFile, code);

    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    await onEnd(
      buildResult({
        [jsFile]: { bytes: 200, inputs: {}, imports: [], exports: [] },
      }),
    );

    const output = fs.readFileSync(jsFile, "utf-8");
    // 마커가 각 문자열에 독립적으로 적용됨 → 2회 등장
    const markerCount = (output.match(/\/\* marker \*\//g) ?? []).length;
    expect(markerCount).toBe(2);
  });

  // Scenario: styles 배열이 비어 있으면 파일 수정 안 함
  it("styles 배열이 비어 있으면 .js 파일이 수정되지 않는다", async () => {
    const jsFile = path.join(tmpDir, "empty.js");
    const code = [
      'import * as i0 from "@angular/core";',
      "class MyComp {}",
      "MyComp.ɵcmp = i0.ɵɵdefineComponent({",
      "  styles: []",
      "});",
    ].join("\n");
    fs.writeFileSync(jsFile, code);

    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    await onEnd(
      buildResult({
        [jsFile]: { bytes: 200, inputs: {}, imports: [], exports: [] },
      }),
    );

    expect(fs.readFileSync(jsFile, "utf-8")).toBe(code);
  });

  // Scenario: ɵɵdefineComponent 외부의 styles 속성은 무시
  it("ɵɵdefineComponent 외부의 styles 속성은 처리되지 않는다", async () => {
    const jsFile = path.join(tmpDir, "outside.js");
    const code = [
      'const config = { styles: [".host { display: flex; }"] };',
      "export default config;",
    ].join("\n");
    fs.writeFileSync(jsFile, code);

    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    await onEnd(
      buildResult({
        [jsFile]: { bytes: 200, inputs: {}, imports: [], exports: [] },
      }),
    );

    expect(fs.readFileSync(jsFile, "utf-8")).toBe(code);
  });

  // Scenario: 한 .js 파일 내 여러 ɵɵdefineComponent의 styles 모두 처리
  it("한 파일 내 여러 ɵɵdefineComponent의 styles 모두에 PostCSS가 적용된다", async () => {
    const jsFile = path.join(tmpDir, "bundle.js");
    const code = [
      'import * as i0 from "@angular/core";',
      "class CompA {}",
      "CompA.ɵcmp = i0.ɵɵdefineComponent({",
      '  styles: [".a { color: red; }"]',
      "});",
      "class CompB {}",
      "CompB.ɵcmp = i0.ɵɵdefineComponent({",
      '  styles: [".b { color: blue; }"]',
      "});",
    ].join("\n");
    fs.writeFileSync(jsFile, code);

    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    await onEnd(
      buildResult({
        [jsFile]: { bytes: 200, inputs: {}, imports: [], exports: [] },
      }),
    );

    const output = fs.readFileSync(jsFile, "utf-8");
    const markerCount = (output.match(/\/\* marker \*\//g) ?? []).length;
    expect(markerCount).toBe(2);
    expect(output).toContain("color: red");
    expect(output).toContain("color: blue");
  });

  // Scenario: .js 파일 inline CSS PostCSS 적용 실패 시 esbuild error 추가
  it(".js inline CSS PostCSS 실패 시 result.errors에 에러가 추가된다", async () => {
    const jsFile = path.join(tmpDir, "fail.js");
    const code = [
      'import * as i0 from "@angular/core";',
      "class MyComp {}",
      "MyComp.ɵcmp = i0.ɵɵdefineComponent({",
      '  styles: [".host { display: flex; }"]',
      "});",
    ].join("\n");
    fs.writeFileSync(jsFile, code);

    const plugin = createPostcssPlugin({ plugins: [throwingPlugin()] });
    const onEnd = captureOnEnd(plugin);

    const result = buildResult({
      [jsFile]: { bytes: 200, inputs: {}, imports: [], exports: [] },
    });
    await onEnd(result);

    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0].text).toContain("postcss-boom");
    expect(result.errors[0].text).toContain(jsFile);
  });
});
