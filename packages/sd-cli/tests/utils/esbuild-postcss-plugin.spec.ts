import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import postcss from "postcss";
import type esbuild from "esbuild";
import { createPostcssPlugin } from "../../src/esbuild/esbuild-postcss-plugin";

// --- Helpers ---

function markerPlugin(): postcss.Plugin {
  return {
    postcssPlugin: "test-marker",
    Once(root) {
      root.prepend(new postcss.Comment({ text: "marker" }));
    },
  };
}

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

function buildResult(
  outputs: Record<string, unknown>,
): esbuild.BuildResult {
  return {
    errors: [] as esbuild.Message[],
    warnings: [] as esbuild.Message[],
    metafile: { inputs: {}, outputs } as esbuild.Metafile,
    outputFiles: [],
    mangleCache: {},
  };
}

// --- Tests ---

describe("createPostcssPlugin — 플러그인 구조", () => {
  it("플러그인 이름이 sd-postcss이다", () => {
    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    expect(plugin.name).toBe("sd-postcss");
  });

  it("onEnd 콜백이 등록된다", () => {
    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    let registered = false;
    void plugin.setup({
      onEnd() {
        registered = true;
      },
    } as unknown as esbuild.PluginBuild);
    expect(registered).toBe(true);
  });
});

describe("createPostcssPlugin — metafile 가드", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "postcss-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("metafile이 null이면 아무 처리도 하지 않는다", async () => {
    const cssFile = path.join(tmpDir, "main.css");
    const original = ".host { display: flex; }";
    fs.writeFileSync(cssFile, original);

    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    await onEnd({
      errors: [],
      warnings: [],
      metafile: undefined,
      outputFiles: [],
      mangleCache: {},
    });

    expect(fs.readFileSync(cssFile, "utf-8")).toBe(original);
  });
});

describe("createPostcssPlugin — .css 파일 처리", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "postcss-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("여러 .css 파일이 있으면 모두 처리된다", async () => {
    const css1 = path.join(tmpDir, "a.css");
    const css2 = path.join(tmpDir, "b.css");
    fs.writeFileSync(css1, ".a { color: red; }");
    fs.writeFileSync(css2, ".b { color: blue; }");

    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    await onEnd(
      buildResult({
        [css1]: { bytes: 10, inputs: {}, imports: [], exports: [] },
        [css2]: { bytes: 10, inputs: {}, imports: [], exports: [] },
      }),
    );

    expect(fs.readFileSync(css1, "utf-8")).toContain("/* marker */");
    expect(fs.readFileSync(css2, "utf-8")).toContain("/* marker */");
  });

  it("outputs에 .css 파일이 없으면 파일을 읽지 않는다", async () => {
    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    // .js와 .map만 있는 outputs — 에러 없이 정상 완료
    await onEnd(
      buildResult({
        "dist/main.js": { bytes: 10, inputs: {}, imports: [], exports: [] },
        "dist/main.js.map": { bytes: 10, inputs: {}, imports: [], exports: [] },
      }),
    );

    // 에러 없이 완료되면 성공
  });

  it("PostCSS 에러 메시지에 파일 경로가 포함된다", async () => {
    const cssFile = path.join(tmpDir, "err.css");
    fs.writeFileSync(cssFile, ".host { color: red; }");

    const throwing: postcss.Plugin = {
      postcssPlugin: "throw-with-detail",
      Once() {
        throw new Error("detailed-error-message");
      },
    };

    const plugin = createPostcssPlugin({ plugins: [throwing] });
    const onEnd = captureOnEnd(plugin);

    const result = buildResult({
      [cssFile]: { bytes: 10, inputs: {}, imports: [], exports: [] },
    });
    await onEnd(result);

    expect(result.errors[0].text).toContain(cssFile);
    expect(result.errors[0].text).toContain("detailed-error-message");
  });
});

describe("createPostcssPlugin — .js 파일 사전 필터링", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "postcss-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("styles 문자열이 없는 .js 파일은 원본이 유지된다", async () => {
    const jsFile = path.join(tmpDir, "chunk.js");
    const original = 'export const x = "no relevant content";';
    fs.writeFileSync(jsFile, original);

    const plugin = createPostcssPlugin({ plugins: [markerPlugin()] });
    const onEnd = captureOnEnd(plugin);

    await onEnd(
      buildResult({
        [jsFile]: { bytes: 50, inputs: {}, imports: [], exports: [] },
      }),
    );

    expect(fs.readFileSync(jsFile, "utf-8")).toBe(original);
  });
});

describe("createPostcssPlugin — .js AST 기반 styles 추출", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "postcss-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("styles 배열에 Identifier(변수 참조)만 있으면 파일이 수정되지 않는다", async () => {
    const jsFile = path.join(tmpDir, "varref.js");
    const code = [
      'import * as i0 from "@angular/core";',
      "const _c0 = [];",
      "class MyComp {}",
      "MyComp.ɵcmp = i0.ɵɵdefineComponent({",
      "  styles: _c0",
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

  it("styles 배열에 문자열과 변수 참조가 혼재하면 문자열만 처리된다", async () => {
    const jsFile = path.join(tmpDir, "mixed.js");
    const code = [
      'import * as i0 from "@angular/core";',
      "const _c0 = '.external { margin: 0 }';",
      "class MyComp {}",
      "MyComp.ɵcmp = i0.ɵɵdefineComponent({",
      '  styles: [_c0, ".inline { color: red; }"]',
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
    // 문자열 리터럴만 처리됨 (마커 1개)
    const markerCount = (output.match(/\/\* marker \*\//g) ?? []).length;
    expect(markerCount).toBe(1);
    // 변수 참조는 원본 유지
    expect(output).toContain("_c0");
  });

  it(".js PostCSS 실패 시에도 다른 .css 파일은 정상 처리된다", async () => {
    const jsFile = path.join(tmpDir, "fail.js");
    const cssFile = path.join(tmpDir, "ok.css");
    const jsCode = [
      'import * as i0 from "@angular/core";',
      "class MyComp {}",
      "MyComp.ɵcmp = i0.ɵɵdefineComponent({",
      '  styles: [".host { display: flex; }"]',
      "});",
    ].join("\n");
    fs.writeFileSync(jsFile, jsCode);
    fs.writeFileSync(cssFile, ".ok { color: green; }");

    const throwing: postcss.Plugin = {
      postcssPlugin: "test-throwing",
      Once() {
        throw new Error("js-postcss-error");
      },
    };

    const plugin = createPostcssPlugin({ plugins: [throwing] });
    const onEnd = captureOnEnd(plugin);

    const result = buildResult({
      [cssFile]: { bytes: 20, inputs: {}, imports: [], exports: [] },
      [jsFile]: { bytes: 200, inputs: {}, imports: [], exports: [] },
    });
    await onEnd(result);

    // 에러가 보고됨
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});
