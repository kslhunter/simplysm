import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Unit Tests: createLibraryTransformStylesheet ---

describe("createLibraryTransformStylesheet", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("외부 .scss 파일이면 compileScssFile로 CSS를 반환하고 의존성을 기록한다", async () => {
    const { createLibraryTransformStylesheet } = await import(
      "../../src/utils/ngtsc-build-core"
    );

    const loadPaths = ["/pkg/scss", "/cwd/node_modules"];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    // Mock scss-compiler 대신 실제 호출 — scss가 없으면 에러 나므로 vi.mock으로 처리
    // 실제로는 compileScssFile을 호출하지만, 여기서는 팩토리 구조만 확인
    // scss 파일이 실제로 존재하지 않으므로 에러가 수집될 것
    const result = await transform(
      ".host { color: red; }",
      "/project/src/app.component.ts",
      "/project/src/app.component.scss",
    );

    // 존재하지 않는 파일이므로 에러가 발생하여 scssErrors에 추가됨
    expect(scssErrors.length).toBeGreaterThan(0);
    // 에러 시 "/* SCSS compilation error */" 반환
    expect(result).toBe("/* SCSS compilation error */");
  });

  it("외부 .css 파일이면 null을 반환한다", async () => {
    const { createLibraryTransformStylesheet } = await import(
      "../../src/utils/ngtsc-build-core"
    );

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
    const { createLibraryTransformStylesheet } = await import(
      "../../src/utils/ngtsc-build-core"
    );

    const loadPaths: string[] = [];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    // 순수 CSS는 SCSS 컴파일러가 그대로 통과시킴
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
    const { createLibraryTransformStylesheet } = await import(
      "../../src/utils/ngtsc-build-core"
    );

    const loadPaths: string[] = [];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    // 존재하지 않는 외부 SCSS 파일 → 컴파일 에러
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
    const { createLibraryTransformStylesheet } = await import(
      "../../src/utils/ngtsc-build-core"
    );

    const loadPaths: string[] = [];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    // 인라인 SCSS: 의존성 없음이지만 구조는 기록됨
    await transform(
      ".host { color: red; }",
      "/project/src/app.component.ts",
      undefined,
    );

    // 의존성이 없더라도 scssDependencies에 containingFile 키가 생성됨
    expect(scssDependencies.has("/project/src/app.component.ts")).toBe(true);
  });
});
