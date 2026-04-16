import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type esbuild from "esbuild";
import fs from "fs";
import path from "path";
import os from "os";
import type { AcceptedPlugin } from "postcss";
import { createPostcssPlugin } from "../../src/esbuild/esbuild-postcss-plugin";

/** esbuild 플러그인 lifecycle을 시뮬레이션하는 헬퍼 */
function setupPlugin(plugin: esbuild.Plugin) {
  let onEndCb:
    | ((
        result: esbuild.BuildResult,
      ) => esbuild.OnEndResult | null | void | Promise<esbuild.OnEndResult | null | void>)
    | undefined;

  const mockBuild = {
    onEnd(cb: typeof onEndCb) {
      onEndCb = cb;
    },
  } as unknown as esbuild.PluginBuild;

  void plugin.setup(mockBuild);

  return {
    async invokeOnEnd(result: Partial<esbuild.BuildResult>) {
      return (
        (await onEndCb?.({
          errors: [],
          warnings: [],
          mangleCache: {},
          outputFiles: [],
          metafile: { inputs: {}, outputs: {} },
          ...result,
        } as esbuild.BuildResult)) ?? null
      );
    },
  };
}

/** 테스트용 PostCSS 플러그인: 모든 CSS 앞에 주석을 추가 */
function createTestPostcssPlugin(): AcceptedPlugin {
  return {
    postcssPlugin: "test-prefix",
    Once(root) {
      root.prepend({ text: "processed" });
    },
  };
}

/** ɵɵdefineComponent styles 배열을 포함하는 JS 코드를 생성 (실제 Angular 컴파일 출력 패턴) */
function generateJsWithStyles(styles: string[]): string {
  const stylesLiteral = styles.map((s) => JSON.stringify(s)).join(", ");
  return [
    `import * as i0 from "@angular/core";`,
    `class MyComponent {}`,
    `MyComponent.\u0275cmp = /*@__PURE__*/ i0.\u0275\u0275defineComponent({`,
    `  type: MyComponent,`,
    `  styles: [${stylesLiteral}],`,
    `  template: function() {}`,
    `});`,
    `export { MyComponent };`,
  ].join("\n");
}

describe("createPostcssPlugin — Acceptance Tests", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "postcss-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("replacements가 0건이면 파일 내용이 변경되지 않음", async () => {
    // Given: ɵɵdefineComponent styles 배열이 없는 JS 파일
    const jsContent = `const x = 1;\nexport default x;\n`;
    const jsFile = path.join(tmpDir, "no-styles.js");
    fs.writeFileSync(jsFile, jsContent, "utf-8");

    const plugin = createPostcssPlugin({ plugins: [createTestPostcssPlugin()] });
    const lifecycle = setupPlugin(plugin);

    // When: PostCSS 처리를 시도
    await lifecycle.invokeOnEnd({
      metafile: { inputs: {}, outputs: { [jsFile]: {} as any } },
    });

    // Then: 파일 내용이 변경되지 않음
    const result = fs.readFileSync(jsFile, "utf-8");
    expect(result).toBe(jsContent);
  });

  it("replacements가 1건이면 PostCSS 처리된 CSS로 교체됨", async () => {
    // Given: ɵɵdefineComponent styles 배열에 문자열 리터럴이 1개
    const originalCss = ".host { color: red; }";
    const jsContent = generateJsWithStyles([originalCss]);
    const jsFile = path.join(tmpDir, "one-style.js");
    fs.writeFileSync(jsFile, jsContent, "utf-8");

    const plugin = createPostcssPlugin({ plugins: [createTestPostcssPlugin()] });
    const lifecycle = setupPlugin(plugin);

    // When: PostCSS 처리 수행
    await lifecycle.invokeOnEnd({
      metafile: { inputs: {}, outputs: { [jsFile]: {} as any } },
    });

    // Then: PostCSS 처리된 CSS가 파일에 반영됨
    const result = fs.readFileSync(jsFile, "utf-8");
    expect(result).toContain("/* processed */");
    expect(result).toContain(".host { color: red; }");
    // 파일 앞뒤의 JS 구조가 유지됨
    expect(result).toContain("import");
    expect(result).toContain("export");
  });

  it("replacements가 3건이면 모든 CSS가 PostCSS 처리됨", async () => {
    // Given: ɵɵdefineComponent styles 배열에 문자열 리터럴이 3개
    const styles = [
      ".a { color: red; }",
      ".b { color: blue; }",
      ".c { color: green; }",
    ];
    const jsContent = generateJsWithStyles(styles);
    const jsFile = path.join(tmpDir, "three-styles.js");
    fs.writeFileSync(jsFile, jsContent, "utf-8");

    const plugin = createPostcssPlugin({ plugins: [createTestPostcssPlugin()] });
    const lifecycle = setupPlugin(plugin);

    // When: PostCSS 처리 수행
    await lifecycle.invokeOnEnd({
      metafile: { inputs: {}, outputs: { [jsFile]: {} as any } },
    });

    // Then: 3개 모두 PostCSS 처리됨
    const result = fs.readFileSync(jsFile, "utf-8");
    // 3번의 "/* processed */" 주석이 삽입됨
    const processedCount = (result.match(/\/\* processed \*\//g) ?? []).length;
    expect(processedCount).toBe(3);
    // 원본 CSS 내용이 모두 유지됨
    expect(result).toContain("color: red");
    expect(result).toContain("color: blue");
    expect(result).toContain("color: green");
    // JS 구조가 유지됨
    expect(result).toContain("import");
    expect(result).toContain("export");
  });
});
