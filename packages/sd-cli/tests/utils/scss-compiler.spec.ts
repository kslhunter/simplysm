import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import fs from "node:fs";
import {
  compileScssString,
  compileScssFile,
  compileScssFileAsync,
  compileScssStringAsync,
} from "../../src/angular/scss-compiler";

const FIXTURE_DIR = resolve(import.meta.dirname, "../angular/fixtures/packages/basic-lib");

// Temp directory for node_modules @use test
const tmpDir = resolve(import.meta.dirname, "__scss_test_tmp__");

describe("scss-compiler", () => {
  beforeAll(() => {
    // Create a temp node_modules-like structure for package @use test
    const fakeNmDir = resolve(tmpDir, "node_modules/@simplysm/angular/scss/commons");
    fs.mkdirSync(fakeNmDir, { recursive: true });
    fs.writeFileSync(
      resolve(fakeNmDir, "_variables.scss"),
      "$test-var: red;\n",
    );
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("compileScssString", () => {
    it("compiles inline SCSS with variable to CSS", () => {
      const source = "$color: blue;\n.header { color: $color; }";
      const containingFile = resolve(FIXTURE_DIR, "src/fake-component.ts");
      const loadPaths = [
        resolve(FIXTURE_DIR, "scss"),
        resolve(FIXTURE_DIR, "node_modules"),
      ];

      const result = compileScssString(source, containingFile, loadPaths);

      expect(result.css).toContain(".header");
      expect(result.css).toContain("color: blue");
      expect(result.dependencies).toBeDefined();
    });

    // Acceptance: Scenario "순수 CSS 인라인 스타일은 변환 없이 통과한다"
    it("passes through pure CSS without modification", () => {
      const source = ".header { color: blue; }";
      const containingFile = resolve(FIXTURE_DIR, "src/fake-component.ts");
      const loadPaths: string[] = [];

      const result = compileScssString(source, containingFile, loadPaths);

      expect(result.css).toContain(".header");
      expect(result.css).toContain("color: blue");
    });

    // Acceptance: Scenario "인라인 SCSS 구문 에러 시 diagnostics에 에러가 포함된다"
    it("throws on SCSS syntax error", () => {
      const source = ".header { color: $undefined-var; }";
      const containingFile = resolve(FIXTURE_DIR, "src/fake-component.ts");
      const loadPaths: string[] = [];

      expect(() => compileScssString(source, containingFile, loadPaths)).toThrow();
    });

    // Acceptance: Scenario "같은 패키지 내 상대 경로 @use를 해석한다"
    it("resolves relative @use paths within the package", () => {
      const source = '@use "commons/variables";\n.test { display: block; }';
      const containingFile = resolve(FIXTURE_DIR, "src/fake-component.ts");
      const loadPaths = [resolve(FIXTURE_DIR, "scss")];

      const result = compileScssString(source, containingFile, loadPaths);

      expect(result.css).toBeDefined();
      expect(result.dependencies.length).toBeGreaterThan(0);
      expect(result.dependencies.some((d) => d.includes("_variables.scss"))).toBe(true);
    });

    // Acceptance: Scenario "node_modules 패키지 경로 @use를 해석한다"
    it("resolves node_modules package @use paths", () => {
      const source =
        '@use "@simplysm/angular/scss/commons/variables";\n.test { display: block; }';
      const containingFile = resolve(tmpDir, "src/fake-component.ts");
      const loadPaths = [resolve(tmpDir, "node_modules")];

      const result = compileScssString(source, containingFile, loadPaths);

      expect(result.css).toBeDefined();
      expect(result.dependencies.length).toBeGreaterThan(0);
      expect(
        result.dependencies.some((d) => d.includes("_variables.scss")),
      ).toBe(true);
    });

    // Acceptance: Scenario "해석 실패 시 컴파일 에러가 발생한다"
    it("throws when @use path cannot be resolved", () => {
      const source = '@use "nonexistent/module";\n.test { display: block; }';
      const containingFile = resolve(FIXTURE_DIR, "src/fake-component.ts");
      const loadPaths: string[] = [];

      expect(() => compileScssString(source, containingFile, loadPaths)).toThrow();
    });
  });

  describe("compileScssFile", () => {
    // Acceptance: Scenario "styleUrls의 .scss 파일이 CSS로 컴파일된다"
    it("compiles an external SCSS file to CSS", () => {
      const filePath = resolve(FIXTURE_DIR, "scss/styles.scss");
      const loadPaths = [resolve(FIXTURE_DIR, "scss")];

      const result = compileScssFile(filePath, loadPaths);

      expect(result.css).toContain("lib-container");
      expect(result.dependencies.length).toBeGreaterThan(0);
    });

    // Unit: dependencies include loaded partial files
    it("includes loaded partial files in dependencies", () => {
      const filePath = resolve(FIXTURE_DIR, "scss/styles.scss");
      const loadPaths = [resolve(FIXTURE_DIR, "scss")];

      const result = compileScssFile(filePath, loadPaths);

      expect(
        result.dependencies.some(
          (d) => d.includes("_variables.scss"),
        ),
      ).toBe(true);
    });
  });

  describe("compileScssFileAsync", () => {
    it("compiles external .scss file asynchronously", async () => {
      const filePath = resolve(FIXTURE_DIR, "scss/styles.scss");
      const loadPaths = [resolve(FIXTURE_DIR, "scss")];

      const result = await compileScssFileAsync(filePath, loadPaths);

      expect(result.css).toContain("lib-container");
      expect(result.dependencies).toBeInstanceOf(Array);
    });

    it("throws on invalid SCSS syntax", async () => {
      const invalidPath = resolve(tmpDir, "invalid.scss");
      fs.writeFileSync(invalidPath, ".host { @include nonexistent-mixin(); }");

      await expect(compileScssFileAsync(invalidPath, [])).rejects.toThrow();
    });
  });

  describe("compileScssStringAsync", () => {
    it("compiles inline SCSS string asynchronously", async () => {
      const containingFile = resolve(FIXTURE_DIR, "src/fake-component.ts");

      const result = await compileScssStringAsync(
        "$size: 16px;\n.text { font-size: $size; }",
        containingFile,
        [],
      );

      expect(result.css).toContain("font-size: 16px");
      expect(result.css).not.toContain("$size");
      expect(result.dependencies).toBeInstanceOf(Array);
    });
  });
});
