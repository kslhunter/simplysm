import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { createClientTransformStylesheet } from "../../src/angular/client-transform-stylesheet.js";

const TMP_DIR = path.join(os.tmpdir(), "sd-cli-stylesheet-test");

function ensureTmpDir(): void {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

describe("createClientTransformStylesheet", () => {
  // Scenario: 외부 .scss 파일 변환
  it("compiles external .scss file with sass.compileAsync", async () => {
    ensureTmpDir();
    const scssPath = path.join(TMP_DIR, "component.scss");
    fs.writeFileSync(scssPath, "$color: blue;\n.host { color: $color; }");

    const errors: string[] = [];
    const deps = new Map<string, Set<string>>();
    const transform = createClientTransformStylesheet({
      loadPaths: [],
      scssErrors: errors,
      scssDependencies: deps,
    });

    const result = await transform("", path.join(TMP_DIR, "component.ts"), scssPath);

    expect(result).not.toBeNull();
    expect(result).toContain("color: blue");
    expect(result).not.toContain("$color");
    expect(errors).toHaveLength(0);
  });

  // Scenario: 인라인 SCSS 문자열 변환
  it("compiles inline SCSS string with sass.compileStringAsync", async () => {
    ensureTmpDir();
    const containingFile = path.join(TMP_DIR, "component.ts");

    const errors: string[] = [];
    const deps = new Map<string, Set<string>>();
    const transform = createClientTransformStylesheet({
      loadPaths: [],
      scssErrors: errors,
      scssDependencies: deps,
    });

    const result = await transform(
      "$size: 14px;\n.text { font-size: $size; }",
      containingFile,
    );

    expect(result).not.toBeNull();
    expect(result).toContain("font-size: 14px");
    expect(errors).toHaveLength(0);
  });

  // Scenario: 외부 .css 파일은 변환하지 않는다
  it("returns null for external .css files", async () => {
    ensureTmpDir();
    const cssPath = path.join(TMP_DIR, "component.css");
    fs.writeFileSync(cssPath, ".host { color: red; }");

    const errors: string[] = [];
    const deps = new Map<string, Set<string>>();
    const transform = createClientTransformStylesheet({
      loadPaths: [],
      scssErrors: errors,
      scssDependencies: deps,
    });

    const result = await transform("", path.join(TMP_DIR, "component.ts"), cssPath);

    expect(result).toBeNull();
  });

  // Scenario: SCSS 컴파일 에러 시 에러 수집
  it("collects SCSS compilation errors", async () => {
    ensureTmpDir();
    const scssPath = path.join(TMP_DIR, "error.scss");
    fs.writeFileSync(scssPath, ".host { @include nonexistent-mixin(); }");

    const errors: string[] = [];
    const deps = new Map<string, Set<string>>();
    const transform = createClientTransformStylesheet({
      loadPaths: [],
      scssErrors: errors,
      scssDependencies: deps,
    });

    const result = await transform("", path.join(TMP_DIR, "component.ts"), scssPath);

    // Should not throw but collect errors and return CSS error comment
    expect(result).toBe("/* SCSS compilation error */");
    expect(errors.length).toBeGreaterThan(0);
  });

  // Unit: PostCSS 적용
  it("applies PostCSS plugins when provided", async () => {
    ensureTmpDir();
    const scssPath = path.join(TMP_DIR, "postcss.scss");
    fs.writeFileSync(scssPath, ".host { color: blue; }");

    const testPlugin = () => ({
      postcssPlugin: "test-color-red",
      Declaration(decl: { prop: string; value: string }) {
        if (decl.prop === "color") {
          decl.value = "red";
        }
      },
    });
    testPlugin.postcss = true as const;

    const errors: string[] = [];
    const deps = new Map<string, Set<string>>();
    const transform = createClientTransformStylesheet({
      loadPaths: [],
      postcssPlugins: [testPlugin],
      scssErrors: errors,
      scssDependencies: deps,
    });

    const result = await transform("", path.join(TMP_DIR, "component.ts"), scssPath);

    expect(result).toContain("color: red");
    expect(result).not.toContain("color: blue");
  });

  // Unit: SCSS 의존성 수집
  it("collects SCSS dependencies", async () => {
    ensureTmpDir();
    const partialPath = path.join(TMP_DIR, "_variables.scss");
    fs.writeFileSync(partialPath, "$color: green;");
    const scssPath = path.join(TMP_DIR, "with-dep.scss");
    fs.writeFileSync(scssPath, '@use "variables";\n.host { color: variables.$color; }');

    const errors: string[] = [];
    const deps = new Map<string, Set<string>>();
    const transform = createClientTransformStylesheet({
      loadPaths: [TMP_DIR],
      scssErrors: errors,
      scssDependencies: deps,
    });

    await transform("", path.join(TMP_DIR, "component.ts"), scssPath);

    // scssDependencies should track the dependency
    expect(deps.size).toBeGreaterThan(0);
  });
});
