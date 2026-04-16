import { describe, it, expect } from "vitest";
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures", "worker-plugin");

const { transformWorkerPatterns, createWorkerBundlePlugin } = await import(
  "../../src/esbuild/esbuild-worker-plugin.js"
);

/**
 * transformWorkerPatterns 테스트용 최소 PluginBuild mock 생성.
 * 실제 esbuild 모듈을 사용하여 Worker 번들링이 동작한다.
 */
function createMockBuild(overrides?: Partial<esbuild.BuildOptions>): esbuild.PluginBuild {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-unit-"));
  return {
    esbuild,
    initialOptions: {
      outdir: tmpDir,
      write: false,
      ...overrides,
    },
  } as unknown as esbuild.PluginBuild;
}

describe("transformWorkerPatterns — 패턴 감지", () => {
  it("Worker 패턴이 없는 content에 대해 undefined를 반환한다", () => {
    const result = transformWorkerPatterns(
      'console.log("hello");',
      "/test/entry.js",
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("'Worker' 문자열이 있지만 new URL 패턴이 아니면 undefined를 반환한다", () => {
    const result = transformWorkerPatterns(
      'const w = new Worker("./worker.js");',
      "/test/entry.js",
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("import.meta.url이 아닌 URL 생성은 undefined를 반환한다", () => {
    const result = transformWorkerPatterns(
      'const w = new Worker(new URL("./worker.js", location.href));',
      "/test/entry.js",
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("Worker + new URL + import.meta.url 패턴을 감지하여 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).not.toContain("./worker.js");
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
    expect(result!.errors).toHaveLength(0);
  });

  it("SharedWorker + new URL + import.meta.url 패턴을 감지하여 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const sw = new SharedWorker(new URL("./shared-worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).not.toContain("./shared-worker.js");
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });

  it("복수 Worker 패턴을 모두 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      [
        `const w1 = new Worker(new URL("./worker.js", import.meta.url));`,
        `const w2 = new Worker(new URL("./worker2.js", import.meta.url));`,
      ].join("\n"),
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).not.toContain("./worker.js");
    expect(result!.contents).not.toContain("./worker2.js");
  });
});

describe("transformWorkerPatterns — type: module 처리", () => {
  it("옵션 없는 Worker에 { type: 'module' }을 추가한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    // { type: "module" } 추가됨
    expect(result!.contents).toMatch(/\{\s*type:\s*"module"\s*\}/);
  });

  it("기존 옵션이 있으면 그대로 유지한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).toContain('{ type: "module" }');
  });
});

describe("transformWorkerPatterns — 에러 처리", () => {
  it("Worker 빌드 에러를 errors에 포함하여 반환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker-error.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.errors.length).toBeGreaterThan(0);
  });
});

describe("transformWorkerPatterns — write 옵션", () => {
  it("write: false일 때 workerOutputFiles를 반환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild({ write: false }),
    );

    expect(result).toBeDefined();
    expect(result!.workerOutputFiles).toBeDefined();
    expect(result!.workerOutputFiles!.length).toBeGreaterThan(0);
  });

  it("write: true일 때 workerOutputFiles가 undefined이다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-write-"));

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild({ write: true, outdir: tmpDir }),
    );

    expect(result).toBeDefined();
    expect(result!.workerOutputFiles).toBeUndefined();

    // 대신 디스크에 파일이 기록됨
    const files = fs.readdirSync(tmpDir);
    const workerFile = files.find((f) => /worker-[a-z0-9]+\.js$/i.test(f));
    expect(workerFile).toBeDefined();
  });
});

describe("transformWorkerPatterns — import.meta.resolve 패턴", () => {
  it("import.meta.resolve 상대 경로 패턴을 감지하여 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const p = import.meta.resolve("./node-worker.js");`,
      entryPath,
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeDefined();
    expect(result!.contents).not.toContain("./node-worker.js");
    expect(result!.contents).toMatch(/new URL\("worker-[a-z0-9]+\.js", import\.meta\.url\)\.href/i);
    expect(result!.errors).toHaveLength(0);
  });

  it("절대 모듈 경로의 import.meta.resolve는 무시한다", () => {
    const result = transformWorkerPatterns(
      `const p = import.meta.resolve("some-package");`,
      "/test/entry.js",
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeUndefined();
  });

  it("import.meta.resolve 패턴 없는 파일은 undefined를 반환한다", () => {
    const result = transformWorkerPatterns(
      `console.log("no resolve");`,
      "/test/entry.js",
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeUndefined();
  });

  it("브라우저 + Node.js Worker 패턴이 공존하면 모두 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      [
        `const w = new Worker(new URL("./worker.js", import.meta.url));`,
        `const p = import.meta.resolve("./node-worker.js");`,
      ].join("\n"),
      entryPath,
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeDefined();
    // 브라우저 Worker 치환
    expect(result!.contents).not.toContain('"./worker.js"');
    // Node.js resolve 치환
    expect(result!.contents).not.toContain("import.meta.resolve");
    expect(result!.contents).toMatch(/new URL\("worker-[a-z0-9]+\.js", import\.meta\.url\)\.href/i);
  });

  it("import.meta.resolve Worker 빌드 에러를 errors에 포함한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const p = import.meta.resolve("./worker-error.js");`,
      entryPath,
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeDefined();
    expect(result!.errors.length).toBeGreaterThan(0);
  });

  it("write: false일 때 workerOutputFiles를 반환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const p = import.meta.resolve("./node-worker.js");`,
      entryPath,
      createMockBuild({ write: false, platform: "node" }),
    );

    expect(result).toBeDefined();
    expect(result!.workerOutputFiles).toBeDefined();
    expect(result!.workerOutputFiles!.length).toBeGreaterThan(0);
  });
});

describe("createWorkerBundlePlugin — 플러그인 구조", () => {
  it("esbuild Plugin 프로토콜을 따르는 객체를 반환한다", () => {
    const plugin = createWorkerBundlePlugin();

    expect(plugin.name).toBe("sd-worker-bundle");
    expect(typeof plugin.setup).toBe("function");
  });

  it("setup에서 onLoad/onEnd 훅이 등록된다", async () => {
    const plugin = createWorkerBundlePlugin();

    let hasOnLoad = false;
    let hasOnEnd = false;

    const mockBuild = {
      initialOptions: {},
      onLoad(_opts: unknown, _cb: unknown) { hasOnLoad = true; },
      onEnd(_cb: unknown) { hasOnEnd = true; },
    } as unknown as esbuild.PluginBuild;

    await plugin.setup(mockBuild);

    expect(hasOnLoad).toBe(true);
    expect(hasOnEnd).toBe(true);
  });
});
