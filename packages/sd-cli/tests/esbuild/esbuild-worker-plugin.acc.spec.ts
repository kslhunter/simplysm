import { describe, it, expect } from "vitest";
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures", "worker-plugin");

const { createWorkerBundlePlugin } = await import(
  "../../src/esbuild/esbuild-worker-plugin.js"
);

/**
 * 임시 디렉토리에 entry 파일을 생성하고 esbuild로 빌드한다.
 * Worker fixture 파일은 fixturesDir에서 참조된다.
 */
async function buildWithPlugin(
  entryContent: string,
  options?: { write?: boolean; entryExt?: string },
): Promise<esbuild.BuildResult & { outdir: string }> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-plugin-test-"));
  const ext = options?.entryExt ?? ".js";
  const entryFile = path.join(tmpDir, `entry${ext}`);

  // Worker fixture 파일을 tmpDir에 복사 (entry에서 상대경로 참조 가능하도록)
  for (const f of ["worker.js", "worker2.js", "shared-worker.js", "worker-error.js", "node-worker.js"]) {
    const src = path.join(fixturesDir, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(tmpDir, f));
    }
  }

  fs.writeFileSync(entryFile, entryContent);

  const outdir = path.join(tmpDir, "dist");
  const write = options?.write ?? false;

  const result = await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    write,
    outdir,
    format: "esm",
    platform: "browser",
    metafile: true,
    logLevel: "silent",
    plugins: [createWorkerBundlePlugin()],
  });

  return { ...result, outdir };
}

/**
 * Node.js platform으로 esbuild 빌드한다 (서버 빌드 시뮬레이션).
 */
async function buildNodeWithPlugin(
  entryContent: string,
  options?: { write?: boolean },
): Promise<esbuild.BuildResult & { outdir: string }> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-plugin-node-test-"));
  const entryFile = path.join(tmpDir, "entry.js");

  for (const f of ["worker.js", "worker2.js", "shared-worker.js", "worker-error.js", "node-worker.js"]) {
    const src = path.join(fixturesDir, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(tmpDir, f));
    }
  }

  fs.writeFileSync(entryFile, entryContent);

  const outdir = path.join(tmpDir, "dist");
  const write = options?.write ?? false;

  const result = await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    write,
    outdir,
    format: "esm",
    platform: "node",
    metafile: true,
    logLevel: "silent",
    plugins: [createWorkerBundlePlugin()],
  });

  return { ...result, outdir };
}

describe("esbuild Worker Bundle Plugin — Acceptance", () => {
  it("JS 파일의 Worker 패턴을 감지하여 번들링하고 URL을 치환한다", async () => {
    const result = await buildWithPlugin(
      'const w = new Worker(new URL("./worker.js", import.meta.url));',
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    expect(mainOutput).toBeDefined();
    const content = mainOutput!.text;

    // 원본 경로가 치환됨
    expect(content).not.toContain("./worker.js");
    // worker-[HASH].js 패턴으로 치환
    expect(content).toMatch(/worker-[A-Z0-9]+\.js/i);
    // { type: "module" } 추가됨
    expect(content).toContain("module");

    // Worker 번들 파일이 outputFiles에 포함됨
    const workerOutput = result.outputFiles!.find((f) =>
      /worker-[a-z0-9]+\.js$/i.test(path.basename(f.path)),
    );
    expect(workerOutput).toBeDefined();
  });

  it("SharedWorker 패턴을 감지하여 번들링하고 URL을 치환한다", async () => {
    const result = await buildWithPlugin(
      'const sw = new SharedWorker(new URL("./shared-worker.js", import.meta.url));',
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    const content = mainOutput!.text;

    expect(content).not.toContain("./shared-worker.js");
    expect(content).toMatch(/worker-[A-Z0-9]+\.js/i);
  });

  it("TS 파일의 Worker 패턴을 감지하여 번들링한다", async () => {
    const result = await buildWithPlugin(
      'const w: Worker = new Worker(new URL("./worker.js", import.meta.url));',
      { entryExt: ".ts" },
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    const content = mainOutput!.text;

    expect(content).not.toContain("./worker.js");
    expect(content).toMatch(/worker-[A-Z0-9]+\.js/i);
  });

  it("Worker 패턴 없는 파일은 변환 없이 통과한다", async () => {
    const result = await buildWithPlugin(
      'console.log("no worker");',
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    const content = mainOutput!.text;

    expect(content).toContain("no worker");
    expect(content).not.toMatch(/worker-[A-Z0-9]+\.js/i);
  });

  it("한 파일에 복수 Worker 패턴이 있으면 모두 번들링한다", async () => {
    const result = await buildWithPlugin(
      [
        'const w1 = new Worker(new URL("./worker.js", import.meta.url));',
        'const w2 = new Worker(new URL("./worker2.js", import.meta.url));',
      ].join("\n"),
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    const content = mainOutput!.text;

    expect(content).not.toContain("./worker.js");
    expect(content).not.toContain("./worker2.js");

    // 2개의 서로 다른 worker 번들이 있어야 함
    const workerOutputs = result.outputFiles!.filter((f) =>
      /worker-[a-z0-9]+\.js$/i.test(path.basename(f.path)),
    );
    expect(workerOutputs.length).toBeGreaterThanOrEqual(2);
  });

  it("기존 옵션이 있으면 유지하고 URL 경로만 치환한다", async () => {
    const result = await buildWithPlugin(
      'const w = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });',
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    const content = mainOutput!.text;

    expect(content).not.toContain("./worker.js");
    expect(content).toMatch(/worker-[A-Z0-9]+\.js/i);
    // 기존 { type: "module" }이 유지됨
    expect(content).toContain("module");
  });

  it("Worker 빌드 에러가 메인 빌드로 전파된다", async () => {
    try {
      await buildWithPlugin(
        'const w = new Worker(new URL("./worker-error.js", import.meta.url));',
      );
      expect.fail("빌드 에러가 발생해야 한다");
    } catch (e: unknown) {
      // esbuild.build()는 에러 시 errors 프로퍼티를 가진 예외를 throw
      const buildError = e as { errors?: esbuild.Message[] };
      expect(buildError.errors).toBeDefined();
      expect(buildError.errors!.length).toBeGreaterThan(0);
    }
  });

  it("write: true 빌드에서 Worker 파일이 디스크에 기록된다", async () => {
    const result = await buildWithPlugin(
      'const w = new Worker(new URL("./worker.js", import.meta.url));',
      { write: true },
    );

    expect(result.errors).toHaveLength(0);

    // outdir에 worker-[HASH].js 파일이 존재
    const files = fs.readdirSync(result.outdir);
    const workerFile = files.find((f) => /worker-[a-z0-9]+\.js$/i.test(f));
    expect(workerFile).toBeDefined();
  });

  it("write: false 빌드에서 Worker 파일이 outputFiles에 포함된다", async () => {
    const result = await buildWithPlugin(
      'const w = new Worker(new URL("./worker.js", import.meta.url));',
      { write: false },
    );

    expect(result.errors).toHaveLength(0);

    const workerOutput = result.outputFiles!.find((f) =>
      /worker-[a-z0-9]+\.js$/i.test(path.basename(f.path)),
    );
    expect(workerOutput).toBeDefined();
  });

  it("browser 빌드에서 import.meta.resolve(node worker)는 번들하지 않고 호출을 그대로 둔다", async () => {
    const result = await buildWithPlugin(
      'const p = import.meta.resolve("./node-worker.js");',
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    const content = mainOutput!.text;

    // node 워커는 browser 빌드에서 번들되지 않고 import.meta.resolve가 그대로 남는다
    expect(content).toContain("import.meta.resolve");

    // worker 번들 산출물이 없어야 한다
    const workerOutput = result.outputFiles!.find((f) =>
      /worker-[a-z0-9]+\.js$/i.test(path.basename(f.path)),
    );
    expect(workerOutput).toBeUndefined();
  });

  it("browser 빌드에서 브라우저 워커는 번들하고 node 워커는 그대로 둔다 (공존)", async () => {
    const result = await buildWithPlugin(
      [
        'const w = new Worker(new URL("./worker.js", import.meta.url));',
        'const p = import.meta.resolve("./node-worker.js");',
      ].join("\n"),
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    const content = mainOutput!.text;

    // 브라우저 워커는 번들·치환됨
    expect(content).not.toContain('"./worker.js"');
    expect(content).toMatch(/worker-[A-Z0-9]+\.js/i);
    // node 워커는 그대로 남음 (browser 빌드에서 스킵)
    expect(content).toContain("import.meta.resolve");

    // 브라우저 워커 번들 1개만 존재 (node 워커는 번들 안 됨)
    const workerOutputs = result.outputFiles!.filter((f) =>
      /worker-[a-z0-9]+\.js$/i.test(path.basename(f.path)),
    );
    expect(workerOutputs).toHaveLength(1);
  });
});

describe("esbuild Worker Bundle Plugin — Node.js import.meta.resolve Acceptance", () => {
  it("import.meta.resolve 패턴을 감지하여 번들링하고 경로를 치환한다", async () => {
    const result = await buildNodeWithPlugin(
      'const p = import.meta.resolve("./node-worker.js");',
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    expect(mainOutput).toBeDefined();
    const content = mainOutput!.text;

    // import.meta.resolve가 치환됨
    expect(content).not.toContain("import.meta.resolve");
    // new URL("worker-HASH.js", import.meta.url).href 패턴으로 치환
    expect(content).toMatch(/new URL\("worker-[A-Z0-9]+\.js",\s*import\.meta\.url\)\.href/i);

    // Worker 번들 파일이 outputFiles에 포함됨
    const workerOutput = result.outputFiles!.find((f) =>
      /worker-[a-z0-9]+\.js$/i.test(path.basename(f.path)),
    );
    expect(workerOutput).toBeDefined();
  });

  it("절대 모듈 경로의 import.meta.resolve는 무시한다", async () => {
    const result = await buildNodeWithPlugin(
      'const p = import.meta.resolve("path");',
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    const content = mainOutput!.text;

    // import.meta.resolve가 그대로 남음 (치환되지 않음)
    expect(content).toContain("import.meta.resolve");
  });

  it("브라우저 + Node.js Worker 패턴 공존 시 모두 번들링한다", async () => {
    const result = await buildNodeWithPlugin(
      [
        'const w = new Worker(new URL("./worker.js", import.meta.url));',
        'const p = import.meta.resolve("./node-worker.js");',
      ].join("\n"),
    );

    expect(result.errors).toHaveLength(0);

    const mainOutput = result.outputFiles!.find((f) => path.basename(f.path).startsWith("entry"));
    const content = mainOutput!.text;

    // 브라우저 Worker 치환
    expect(content).not.toContain('"./worker.js"');
    // Node.js resolve 치환
    expect(content).not.toContain("import.meta.resolve");

    // 최소 2개의 worker 번들
    const workerOutputs = result.outputFiles!.filter((f) =>
      /worker-[a-z0-9]+\.js$/i.test(path.basename(f.path)),
    );
    expect(workerOutputs.length).toBeGreaterThanOrEqual(2);
  });

  it("write: true 빌드에서 Worker 파일이 디스크에 기록된다", async () => {
    const result = await buildNodeWithPlugin(
      'const p = import.meta.resolve("./node-worker.js");',
      { write: true },
    );

    expect(result.errors).toHaveLength(0);

    const files = fs.readdirSync(result.outdir);
    const workerFile = files.find((f) => /worker-[a-z0-9]+\.js$/i.test(f));
    expect(workerFile).toBeDefined();
  });
});
