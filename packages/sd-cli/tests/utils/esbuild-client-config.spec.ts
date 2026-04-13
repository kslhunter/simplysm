import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import type esbuildTypes from "esbuild";

// --- Mocks ---

const mockContext = {
  rebuild: vi.fn(),
  watch: vi.fn(),
  dispose: vi.fn(),
};

vi.mock("esbuild", () => ({
  default: {
    context: vi.fn(() => Promise.resolve(mockContext)),
  },
}));

const mockSourceFileCache = {
  loadResultCache: { name: "mockLoadResultCache" },
  invalidate: vi.fn(),
  modifiedFiles: new Set<string>(),
};

const mockAngularPlugin = { name: "angular-compiler" };

vi.mock("@angular/build/private", () => {
  // vi.fn()의 arrow function은 new로 호출 불가 — 일반 function 사용
  function MockSourceFileCache() {
    return mockSourceFileCache;
  }
  return {
    createCompilerPlugin: vi.fn(() => mockAngularPlugin),
    SourceFileCache: vi.fn(MockSourceFileCache),
  };
});

vi.mock("browserslist-to-esbuild", () => ({
  default: vi.fn(() => ["chrome61"]),
}));

vi.mock("module", async (importOriginal) => {
  const actual = await importOriginal<typeof import("module")>();
  return {
    ...actual,
    createRequire: vi.fn(() => (name: string) => {
      if (name === "nonexistent-plugin") {
        throw new Error(`Cannot find module '${name}'`);
      }
      return (..._args: any[]) => ({ postcssPlugin: name });
    }),
  };
});

// --- Imports (after mocks) ---

const { createClientEsbuildContext } = await import(
  "../../src/esbuild/esbuild-client-config"
);
const esbuild = (await import("esbuild")).default;
const { createCompilerPlugin, SourceFileCache } = await import("@angular/build/private");
const browserslistToEsbuild = (await import("browserslist-to-esbuild")).default;

// --- Helpers ---

const baseDev = {
  pkgDir: "/workspace/packages/my-app",
  cwd: "/workspace",
  mode: "dev" as const,
};

const baseBuild = {
  ...baseDev,
  mode: "build" as const,
};

describe("createClientEsbuildContext — define 생성", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dev 모드: ngJitMode=false, ngDevMode/ngHmrMode 미주입", async () => {
    await createClientEsbuildContext(baseDev);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.define!["ngJitMode"]).toBe("false");
    expect(opts.define!["ngDevMode"]).toBeUndefined();
    expect(opts.define!["ngHmrMode"]).toBeUndefined();
  });

  it("build 모드: ngDevMode, ngJitMode, ngHmrMode 모두 false", async () => {
    await createClientEsbuildContext(baseBuild);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.define!["ngDevMode"]).toBe("false");
    expect(opts.define!["ngJitMode"]).toBe("false");
    expect(opts.define!["ngHmrMode"]).toBe("false");
  });

  it("dev + templateUpdates + non-legacy → ngHmrMode = true", async () => {
    await createClientEsbuildContext({
      ...baseDev,
      templateUpdates: new Map<string, string>(),
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.define!["ngHmrMode"]).toBe("true");
  });

  it("dev + templateUpdates + legacyModule → ngHmrMode 미정의", async () => {
    await createClientEsbuildContext({
      ...baseDev,
      templateUpdates: new Map<string, string>(),
      legacyModule: true,
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.define!["ngHmrMode"]).toBeUndefined();
  });

  it("build + templateUpdates → ngHmrMode = false (build 모드 우선)", async () => {
    await createClientEsbuildContext({
      ...baseBuild,
      templateUpdates: new Map<string, string>(),
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.define!["ngHmrMode"]).toBe("false");
  });

  it("env가 없으면 import.meta.env define 없음", async () => {
    await createClientEsbuildContext(baseDev);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.define!["import.meta.env"]).toBeUndefined();
  });

  it("env 설정 시 import.meta.env 객체로 define에 주입", async () => {
    await createClientEsbuildContext({
      ...baseBuild,
      env: { MSG: 'hello "world"' },
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.define!["import.meta.env"]).toBe(JSON.stringify({ MSG: 'hello "world"' }));
  });
});

describe("createClientEsbuildContext — 소스맵 설정", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dev 모드: esbuild sourcemap=linked, CompilerPlugin sourcemap=true, StyleOptions sourcemap=linked", async () => {
    await createClientEsbuildContext(baseDev);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.sourcemap).toBe("linked");

    const [pluginOpts, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(pluginOpts.sourcemap).toBe(true);
    expect(styleOpts.sourcemap).toBe("linked");
  });

  it("build 모드: esbuild sourcemap=false, CompilerPlugin sourcemap=false, StyleOptions sourcemap=false", async () => {
    await createClientEsbuildContext(baseBuild);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.sourcemap).toBe(false);

    const [pluginOpts, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(pluginOpts.sourcemap).toBe(false);
    expect(styleOpts.sourcemap).toBe(false);
  });
});

describe("createClientEsbuildContext — PostCSS 설정", () => {
  beforeEach(() => vi.clearAllMocks());

  it("postcssPlugins 미전달 시 postcssConfiguration이 undefined", async () => {
    await createClientEsbuildContext(baseBuild);
    const [, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(styleOpts.postcssConfiguration).toBeUndefined();
  });

  it("postcssPlugins 전달해도 postcssConfiguration은 항상 undefined", async () => {
    await createClientEsbuildContext({
      ...baseBuild,
      postcssPlugins: [["autoprefixer"]],
    });
    const [, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(styleOpts.postcssConfiguration).toBeUndefined();
  });
});

describe("createClientEsbuildContext — PostCSS 플러그인 통합", () => {
  beforeEach(() => vi.clearAllMocks());

  it("postcssPlugins 전달 시 sd-postcss 플러그인이 plugins에 등록된다", async () => {
    await createClientEsbuildContext({
      ...baseBuild,
      postcssPlugins: [["autoprefixer"]],
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = opts.plugins!.map((p: any) => p.name);
    expect(pluginNames).toContain("sd-postcss");
  });

  it("postcssPlugins 미전달 시 sd-postcss 미등록", async () => {
    await createClientEsbuildContext(baseBuild);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = opts.plugins!.map((p: any) => p.name);
    expect(pluginNames).not.toContain("sd-postcss");
  });

  it("sd-postcss가 customPlugins 뒤, sd-legacy-strip-dynamic-import 앞에 배치된다", async () => {
    const customPlugin = { name: "custom", setup: vi.fn() };
    await createClientEsbuildContext({
      ...baseBuild,
      postcssPlugins: [["autoprefixer"]],
      plugins: [customPlugin as any],
      legacyModule: true,
      onEnd: vi.fn(),
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = opts.plugins!.map((p: any) => p.name);

    const customIdx = pluginNames.indexOf("custom");
    const postcssIdx = pluginNames.indexOf("sd-postcss");
    const stripIdx = pluginNames.indexOf("sd-legacy-strip-dynamic-import");
    const onEndIdx = pluginNames.indexOf("sd-on-end");

    expect(postcssIdx).toBeGreaterThan(customIdx);
    expect(postcssIdx).toBeLessThan(stripIdx);
    expect(postcssIdx).toBeLessThan(onEndIdx);
  });

  it("존재하지 않는 플러그인 이름으로 에러가 throw된다", async () => {
    await expect(
      createClientEsbuildContext({
        ...baseBuild,
        postcssPlugins: [["nonexistent-plugin"]],
      }),
    ).rejects.toThrow("nonexistent-plugin");
  });
});

describe("createClientEsbuildContext — SourceFileCache", () => {
  beforeEach(() => vi.clearAllMocks());

  it("SourceFileCache가 .angular/cache 경로로 생성됨", async () => {
    await createClientEsbuildContext(baseDev);
    expect(SourceFileCache).toHaveBeenCalledWith(
      path.join("/workspace/packages/my-app", ".angular", "cache"),
    );
  });

  it("sourceFileCache와 loadResultCache가 CompilerPluginOptions에 전달됨", async () => {
    await createClientEsbuildContext(baseDev);
    const [pluginOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(pluginOpts.sourceFileCache).toBe(mockSourceFileCache);
    expect(pluginOpts.loadResultCache).toBe(mockSourceFileCache.loadResultCache);
  });
});

describe("createClientEsbuildContext — 추가 옵션", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tsconfig 커스텀 경로 전달", async () => {
    await createClientEsbuildContext({
      ...baseDev,
      tsconfig: "/workspace/packages/my-app/tsconfig.build.json",
    });
    const [pluginOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(pluginOpts.tsconfig).toBe(
      "/workspace/packages/my-app/tsconfig.build.json",
    );
  });

  it("outdir 커스텀 경로 전달", async () => {
    await createClientEsbuildContext({
      ...baseDev,
      outdir: "/custom/output",
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.outdir).toBe("/custom/output");
  });

  it("추가 plugins가 esbuild plugins 배열에 포함됨", async () => {
    const customPlugin = { name: "custom", setup: vi.fn() };
    await createClientEsbuildContext({
      ...baseDev,
      plugins: [customPlugin as any],
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.plugins).toContainEqual(customPlugin);
  });

  it("templateUpdates가 CompilerPluginOptions에 전달됨", async () => {
    const updates = new Map([["comp1", "template1"]]);
    await createClientEsbuildContext({
      ...baseDev,
      templateUpdates: updates,
    });
    const [pluginOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(pluginOpts.templateUpdates).toBe(updates);
  });
});

describe("createClientEsbuildContext — browserslist → target 변환", () => {
  beforeEach(() => vi.clearAllMocks());

  it("browserslist 미설정 시 esbuild target이 [es2022]", async () => {
    await createClientEsbuildContext(baseDev);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.target).toEqual(["es2022"]);
  });

  it("browserslist 미설정 시 BundleStylesheetOptions.target이 [es2022]", async () => {
    await createClientEsbuildContext(baseDev);
    const [, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(styleOpts.target).toEqual(["es2022"]);
  });

  it("browserslist 문자열은 배열로 변환하여 browserslistToEsbuild에 전달", async () => {
    vi.mocked(browserslistToEsbuild).mockReturnValueOnce(["chrome61"]);
    await createClientEsbuildContext({ ...baseDev, browserslist: "Chrome 61" });
    expect(browserslistToEsbuild).toHaveBeenCalledWith(["Chrome 61"]);
  });

  it("browserslist 배열은 그대로 browserslistToEsbuild에 전달", async () => {
    vi.mocked(browserslistToEsbuild).mockReturnValueOnce(["chrome61", "firefox60"]);
    await createClientEsbuildContext({
      ...baseDev,
      browserslist: ["Chrome 61", "Firefox 60"],
    });
    expect(browserslistToEsbuild).toHaveBeenCalledWith(["Chrome 61", "Firefox 60"]);
  });

  it("browserslistToEsbuild 결과가 esbuild target과 styleOptions.target에 동일하게 적용", async () => {
    vi.mocked(browserslistToEsbuild).mockReturnValueOnce(["chrome61", "firefox60"]);
    await createClientEsbuildContext({
      ...baseDev,
      browserslist: ["Chrome 61", "Firefox 60"],
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const [, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(opts.target).toEqual(["chrome61", "firefox60"]);
    expect(styleOpts.target).toEqual(["chrome61", "firefox60"]);
  });
});

describe("createClientEsbuildContext — 출력 네이밍", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dev 모드: entryNames이 [name]", async () => {
    await createClientEsbuildContext(baseDev);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.entryNames).toBe("[name]");
  });

  it("build 모드: entryNames이 [name]-[hash]", async () => {
    await createClientEsbuildContext(baseBuild);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.entryNames).toBe("[name]-[hash]");
  });

  it("chunkNames와 assetNames도 entryNames와 동일 패턴", async () => {
    await createClientEsbuildContext(baseBuild);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.chunkNames).toBe(opts.entryNames);
    expect(opts.assetNames).toBe(opts.entryNames);
  });
});

describe("createClientEsbuildContext — polyfills entryPoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("polyfills 1개 전달 시 main.ts 뒤에 추가", async () => {
    await createClientEsbuildContext({
      ...baseDev,
      polyfills: ["src/polyfills.ts"],
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.entryPoints).toEqual([
      path.join(baseDev.pkgDir, "src", "main.ts"),
      path.join(baseDev.pkgDir, "src/polyfills.ts"),
    ]);
  });

  it("polyfills 여러 개 전달 시 모두 절대경로로 추가", async () => {
    await createClientEsbuildContext({
      ...baseDev,
      polyfills: ["src/polyfills.ts", "src/zone-flags.ts"],
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.entryPoints).toEqual([
      path.join(baseDev.pkgDir, "src", "main.ts"),
      path.join(baseDev.pkgDir, "src/polyfills.ts"),
      path.join(baseDev.pkgDir, "src/zone-flags.ts"),
    ]);
  });
});

describe("createClientEsbuildContext — onEnd 플러그인", () => {
  beforeEach(() => vi.clearAllMocks());

  function captureOnEndCallback(
    options: Parameters<typeof createClientEsbuildContext>[0],
  ) {
    return (async () => {
      await createClientEsbuildContext(options);
      const opts = vi.mocked(esbuild.context).mock.calls[0][0];
      const sdOnEndPlugin = opts.plugins!.find(
        (p: any) => p.name === "sd-on-end",
      )!;

      let cb!: (result: any) => any;
      (sdOnEndPlugin as any).setup({
        onEnd(fn: (result: any) => any) {
          cb = fn;
        },
      });
      return cb;
    })();
  }

  it("sd-on-end가 async onEnd의 반환 Promise를 그대로 return한다", async () => {
    const asyncOnEnd = vi.fn().mockResolvedValue(undefined);
    const cb = await captureOnEndCallback({ ...baseDev, onEnd: asyncOnEnd });

    const result = cb({ errors: [], warnings: [] });
    expect(result).toBeInstanceOf(Promise);
  });

  it("sd-on-end가 sync onEnd의 반환값(undefined)을 그대로 return한다", async () => {
    const syncOnEnd = vi.fn();
    const cb = await captureOnEndCallback({ ...baseDev, onEnd: syncOnEnd });

    const result = cb({ errors: [], warnings: [] });
    expect(result).toBeUndefined();
  });

  it("onEnd 전달 시 sd-on-end 플러그인이 plugins 마지막에 추가됨", async () => {
    await createClientEsbuildContext({
      ...baseDev,
      onEnd: vi.fn(),
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = opts.plugins!.map((p: any) => p.name);
    expect(pluginNames).toContain("sd-on-end");
    expect(pluginNames[pluginNames.length - 1]).toBe("sd-on-end");
  });

  it("customPlugins가 angularPlugin 이전에 위치 (onStart에서 sourceFileCache 무효화 선행)", async () => {
    await createClientEsbuildContext({
      ...baseDev,
      plugins: [{ name: "custom", setup: vi.fn() } as any],
      onEnd: vi.fn(),
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = opts.plugins!.map((p: any) => p.name);
    const customIdx = pluginNames.indexOf("custom");
    const angularIdx = pluginNames.indexOf("angular-compiler");
    expect(customIdx).toBeLessThan(angularIdx);
  });
});

describe("createClientEsbuildContext — tsconfig esbuild 옵션", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tsconfig 미전달 시 esbuild에 pkgDir/tsconfig.json 전달", async () => {
    await createClientEsbuildContext(baseDev);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.tsconfig).toBe(
      path.join("/workspace/packages/my-app", "tsconfig.json"),
    );
  });

  it("tsconfig 커스텀 경로 전달 시 esbuild에도 동일 경로 전달", async () => {
    await createClientEsbuildContext({
      ...baseDev,
      tsconfig: "/workspace/packages/my-app/tsconfig.build.json",
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.tsconfig).toBe("/workspace/packages/my-app/tsconfig.build.json");
  });
});

describe("createClientEsbuildContext — SCSS 플러그인 통합", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sd-scss 플러그인이 plugins 배열에 포함됨", async () => {
    await createClientEsbuildContext(baseDev);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = opts.plugins!.map((p: any) => p.name);
    expect(pluginNames).toContain("sd-scss");
  });

  it("sd-scss 플러그인이 angularPlugin 다음에 위치", async () => {
    const customPlugin = { name: "custom", setup: vi.fn() };
    await createClientEsbuildContext({
      ...baseDev,
      plugins: [customPlugin as any],
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = opts.plugins!.map((p: any) => p.name);

    const angularIdx = pluginNames.indexOf("angular-compiler");
    const scssIdx = pluginNames.indexOf("sd-scss");

    expect(scssIdx).toBe(angularIdx + 1);
  });
});

describe("createClientEsbuildContext — legacyModule 설정", () => {
  beforeEach(() => vi.clearAllMocks());

  it("legacyModule true → splitting false", async () => {
    await createClientEsbuildContext({ ...baseDev, legacyModule: true });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.splitting).toBe(false);
  });

  it("legacyModule 미설정 → splitting true 유지", async () => {
    await createClientEsbuildContext(baseDev);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.splitting).toBe(true);
  });

  it("legacyModule true → supported['import-meta'] false", async () => {
    await createClientEsbuildContext({ ...baseDev, legacyModule: true });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.supported).toEqual({ "import-meta": false });
  });

  it("legacyModule 미설정 → supported 미설정", async () => {
    await createClientEsbuildContext(baseDev);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.supported).toBeUndefined();
  });

  it("legacyModule true + env 설정 → define과 supported 공존", async () => {
    await createClientEsbuildContext({
      ...baseDev,
      legacyModule: true,
      env: { API_URL: "https://api.example.com" },
    });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.define!["import.meta.env"]).toBe(
      JSON.stringify({ API_URL: "https://api.example.com" }),
    );
    expect(opts.supported).toEqual({ "import-meta": false });
  });

  it("legacyModule false → splitting true, supported 미설정", async () => {
    await createClientEsbuildContext({ ...baseDev, legacyModule: false });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(opts.splitting).toBe(true);
    expect(opts.supported).toBeUndefined();
  });
});

describe("createClientEsbuildContext — legacyModule dynamic import 스트립 플러그인", () => {
  beforeEach(() => vi.clearAllMocks());

  it("legacyModule true → sd-legacy-strip-dynamic-import 플러그인 추가", async () => {
    await createClientEsbuildContext({ ...baseDev, legacyModule: true });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = opts.plugins!.map((p: any) => p.name);
    expect(pluginNames).toContain("sd-legacy-strip-dynamic-import");
  });

  it("legacyModule 미설정 → sd-legacy-strip-dynamic-import 플러그인 미추가", async () => {
    await createClientEsbuildContext(baseDev);
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = opts.plugins!.map((p: any) => p.name);
    expect(pluginNames).not.toContain("sd-legacy-strip-dynamic-import");
  });

  async function captureStripOnEnd() {
    await createClientEsbuildContext({ ...baseDev, legacyModule: true });
    const opts = vi.mocked(esbuild.context).mock.calls[0][0];
    const stripPlugin = opts.plugins!.find(
      (p: any) => p.name === "sd-legacy-strip-dynamic-import",
    )!;

    let onEndCallback: (result: esbuildTypes.BuildResult) => Promise<void>;
    (stripPlugin as any).setup({
      onEnd(cb: (result: esbuildTypes.BuildResult) => Promise<void>) {
        onEndCallback = cb;
      },
    });

    const { promises: fsPromises } = await import("fs");
    const readSpy = vi.spyOn(fsPromises, "readFile");
    const writeSpy = vi.spyOn(fsPromises, "writeFile").mockResolvedValue();

    return {
      runOnEnd: (outputs: Record<string, unknown>, fileContent: string) => {
        readSpy.mockResolvedValue(fileContent);
        return onEndCallback!({
          metafile: { inputs: {}, outputs },
          errors: [],
          warnings: [],
          outputFiles: [],
          mangleCache: {},
        } as unknown as esbuildTypes.BuildResult);
      },
      readSpy,
      writeSpy,
      cleanup: () => {
        readSpy.mockRestore();
        writeSpy.mockRestore();
      },
    };
  }

  it("import() 포함 파일을 no-op 함수로 치환", async () => {
    const { runOnEnd, readSpy, writeSpy, cleanup } = await captureStripOnEnd();

    await runOnEnd(
      {
        "dist/main.js": { bytes: 100, inputs: {}, imports: [], exports: [] },
        "dist/main.css": { bytes: 50, inputs: {}, imports: [], exports: [] },
      },
      'var x = import("./chunk.js");',
    );

    expect(readSpy).toHaveBeenCalledWith("dist/main.js", "utf-8");
    expect(readSpy).not.toHaveBeenCalledWith("dist/main.css", "utf-8");
    expect(writeSpy).toHaveBeenCalledWith(
      "dist/main.js",
      'var x = (function(){return Promise.reject(new Error("Dynamic import not supported"))})("./chunk.js");',
    );
    cleanup();
  });

  it("import() 없는 파일은 수정하지 않음", async () => {
    const { runOnEnd, writeSpy, cleanup } = await captureStripOnEnd();

    await runOnEnd(
      { "dist/main.js": { bytes: 100, inputs: {}, imports: [], exports: [] } },
      'var x = "no dynamic imports here";',
    );

    expect(writeSpy).not.toHaveBeenCalled();
    cleanup();
  });

  it("여러 import() 호출을 모두 치환", async () => {
    const { runOnEnd, writeSpy, cleanup } = await captureStripOnEnd();

    await runOnEnd(
      { "dist/main.js": { bytes: 100, inputs: {}, imports: [], exports: [] } },
      'import("./a.js"); import ("./b.js");',
    );

    const written = writeSpy.mock.calls[0][1] as string;
    const noopFn =
      '(function(){return Promise.reject(new Error("Dynamic import not supported"))})';
    expect(written).toContain(`${noopFn}("./a.js");`);
    expect(written).toContain(`${noopFn}("./b.js");`);
    cleanup();
  });
});
