import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type esbuild from "esbuild";
import fs from "fs";
import path from "path";
import os from "os";
import { createScssPlugin } from "../../src/esbuild/esbuild-scss-plugin";

// --- onLoad 콜백 캡처 헬퍼 ---

interface OnLoadRegistration {
  options: { filter: RegExp; namespace?: string };
  callback: (args: esbuild.OnLoadArgs) => Promise<esbuild.OnLoadResult | null | undefined>;
}

function captureOnLoad(plugin: esbuild.Plugin): OnLoadRegistration {
  let registration: OnLoadRegistration | undefined;
  const mockBuild = {
    onLoad(opts: any, cb: any) {
      registration = { options: opts, callback: cb };
    },
  };
  void plugin.setup(mockBuild as any);
  return registration!;
}

describe("createScssPlugin — Unit", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scss-unit-test-"));

    // 기본 SCSS 파일
    fs.writeFileSync(
      path.join(tmpDir, "simple.scss"),
      `$size: 16px;\n.text { font-size: $size; }`,
    );

    // 의존성이 있는 SCSS 파일
    fs.mkdirSync(path.join(tmpDir, "scss"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "scss", "_vars.scss"),
      `$bg: white;`,
    );
    fs.writeFileSync(
      path.join(tmpDir, "with-dep.scss"),
      `@use "vars";\n.box { background: vars.$bg; }`,
    );

    // 에러 SCSS 파일
    fs.writeFileSync(
      path.join(tmpDir, "broken.scss"),
      `.broken { color: $nonexistent; }`,
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("플러그인 name이 'sd-scss'이다", () => {
    const plugin = createScssPlugin({ loadPaths: [] });
    expect(plugin.name).toBe("sd-scss");
  });

  it("onLoad filter가 /\\.scss$/이다", () => {
    const plugin = createScssPlugin({ loadPaths: [] });
    const { options } = captureOnLoad(plugin);
    expect(options.filter.test("style.scss")).toBe(true);
    expect(options.filter.test("style.css")).toBe(false);
    expect(options.filter.test("style.scss.ts")).toBe(false);
  });

  it("성공 시 컴파일된 CSS를 loader: 'css'로 반환한다", async () => {
    const plugin = createScssPlugin({ loadPaths: [] });
    const { callback } = captureOnLoad(plugin);

    const result = await callback({
      path: path.join(tmpDir, "simple.scss"),
      namespace: "file",
      suffix: "",
      pluginData: undefined,
      with: {},
    });

    expect(result).toBeDefined();
    expect(result!.contents).toContain("font-size: 16px");
    expect(result!.loader).toBe("css");
  });

  it("성공 시 watchFiles에 sass 의존성 경로를 포함한다", async () => {
    const plugin = createScssPlugin({ loadPaths: [path.join(tmpDir, "scss")] });
    const { callback } = captureOnLoad(plugin);

    const result = await callback({
      path: path.join(tmpDir, "with-dep.scss"),
      namespace: "file",
      suffix: "",
      pluginData: undefined,
      with: {},
    });

    expect(result).toBeDefined();
    expect(result!.watchFiles).toBeDefined();
    expect(result!.watchFiles!.length).toBeGreaterThan(0);

    const hasVarsFile = result!.watchFiles!.some((f) => f.includes("_vars.scss"));
    expect(hasVarsFile).toBe(true);
  });

  it("sass 에러 시 esbuild errors 형식으로 파일/라인 정보를 반환한다", async () => {
    const plugin = createScssPlugin({ loadPaths: [] });
    const { callback } = captureOnLoad(plugin);

    const result = await callback({
      path: path.join(tmpDir, "broken.scss"),
      namespace: "file",
      suffix: "",
      pluginData: undefined,
      with: {},
    });

    expect(result).toBeDefined();
    expect(result!.errors).toBeDefined();
    expect(result!.errors!.length).toBeGreaterThan(0);

    const error = result!.errors![0];
    expect(error.text).toBeDefined();
    expect(error.location).toBeDefined();
    expect(error.location!.file).toContain("broken.scss");
    expect(error.location!.line).toBeGreaterThan(0);
  });

  it("loadPaths가 sass 컴파일에 올바르게 전달된다", async () => {
    const plugin = createScssPlugin({ loadPaths: [path.join(tmpDir, "scss")] });
    const { callback } = captureOnLoad(plugin);

    const result = await callback({
      path: path.join(tmpDir, "with-dep.scss"),
      namespace: "file",
      suffix: "",
      pluginData: undefined,
      with: {},
    });

    // loadPaths 없이는 @use "vars"가 실패하므로, 성공 = loadPaths 전달 검증
    expect(result).toBeDefined();
    expect(result!.errors).toBeUndefined();
    expect(result!.contents).toContain("background: white");
  });
});
