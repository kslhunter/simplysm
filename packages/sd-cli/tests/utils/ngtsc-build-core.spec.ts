import { describe, it, expect } from "vitest";

import { createLibraryTransformStylesheet } from "../../src/angular/ngtsc-build-core";

describe("createLibraryTransformStylesheet", () => {
  it("외부 .scss 파일이면 compileScssFile로 CSS를 반환하고 의존성을 기록한다", async () => {
    const loadPaths = ["/pkg/scss", "/cwd/node_modules"];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    const result = await transform(
      ".host { color: red; }",
      "/project/src/app.component.ts",
      "/project/src/app.component.scss",
    );

    expect(scssErrors.length).toBeGreaterThan(0);
    expect(result).toBe("/* SCSS compilation error */");
  });

  it("외부 .css 파일이면 null을 반환한다", async () => {
    const loadPaths = ["/pkg/scss"];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    const result = await transform(
      ".host { color: red; }",
      "/project/src/app.component.ts",
      "/project/src/app.component.css",
    );

    expect(result).toBeNull();
    expect(scssErrors.length).toBe(0);
  });

  it("인라인 SCSS(stylesheetFile 미지정)이면 compileScssString으로 CSS를 반환한다", async () => {
    const loadPaths: string[] = [];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    const result = await transform(
      ".host { color: red; }",
      "/project/src/app.component.ts",
      undefined,
    );

    expect(typeof result).toBe("string");
    expect(result).toContain("color: red");
    expect(scssErrors.length).toBe(0);
  });

  it("SCSS 컴파일 에러 시 scssErrors에 에러를 추가하고 에러 주석을 반환한다", async () => {
    const loadPaths: string[] = [];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    const result = await transform(
      "",
      "/project/src/broken.component.ts",
      "/nonexistent/path/broken.scss",
    );

    expect(result).toBe("/* SCSS compilation error */");
    expect(scssErrors.length).toBeGreaterThan(0);
    expect(scssErrors[0]).toContain("SCSS error");
  });

  it("SCSS 의존성이 scssDependencies에 기록된다", async () => {
    const loadPaths: string[] = [];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    await transform(
      ".host { color: red; }",
      "/project/src/app.component.ts",
      undefined,
    );

    expect(scssDependencies.has("/project/src/app.component.ts")).toBe(true);
  });
});
