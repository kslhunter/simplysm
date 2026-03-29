import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { transformWorkerPaths } from "../../src/pkg-builders/commons/SdWorkerPathPlugin";
import path from "path";
import fs from "fs";
import os from "os";

describe("transformWorkerPaths", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-worker-test-"));

    const workersDir = path.join(tmpDir, "src", "workers");
    fs.mkdirSync(workersDir, { recursive: true });
    fs.writeFileSync(
      path.join(workersDir, "test.worker.ts"),
      "self.onmessage = (e: MessageEvent) => { self.postMessage('ok'); };",
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("서버 패턴 -- import.meta.resolve() 직접 사용", () => {
    it("치환 결과는 new URL(..., import.meta.url).href 형태이다", async () => {
      const source = `const url = import.meta.resolve("./workers/test.worker");`;
      const filePath = path.join(tmpDir, "src", "main.ts");
      const outdir = path.join(tmpDir, "dist-server");

      const result = await transformWorkerPaths(source, filePath, outdir, {
        format: "esm",
        platform: "node",
        logLevel: "silent",
      });

      // new URL("./workers/test.worker-{hash}.js", import.meta.url).href 형태여야 함
      expect(result).toMatch(
        /new URL\(["']\.\/workers\/test\.worker-[a-f0-9]+\.js["'], import\.meta\.url\)\.href/,
      );
    });
  });

  describe("클라이언트 패턴 -- new URL(import.meta.resolve(...), import.meta.url) 사용", () => {
    it("import.meta.resolve() 부분만 치환되어 이중 new URL() 래핑이 된다", async () => {
      const source = `const w = new Worker(new URL(import.meta.resolve("./workers/test.worker"), import.meta.url));`;
      const filePath = path.join(tmpDir, "src", "main.ts");
      const outdir = path.join(tmpDir, "dist-client");

      const result = await transformWorkerPaths(source, filePath, outdir, {
        format: "esm",
        platform: "browser",
        logLevel: "silent",
      });

      // import.meta.resolve() 부분이 new URL(...).href로 치환
      expect(result).toMatch(
        /new URL\(new URL\(["']\.\/workers\/test\.worker-[a-f0-9]+\.js["'], import\.meta\.url\)\.href, import\.meta\.url\)/,
      );
    });
  });

  describe("공통 계약", () => {
    it("변환 후 import.meta.resolve 호출이 제거된다", async () => {
      const source = `const url = import.meta.resolve("./workers/test.worker");`;
      const filePath = path.join(tmpDir, "src", "main.ts");
      const outdir = path.join(tmpDir, "dist-common1");

      const result = await transformWorkerPaths(source, filePath, outdir, {
        format: "esm",
        platform: "node",
        logLevel: "silent",
      });

      expect(result).not.toContain("import.meta.resolve");
    });

    it("변환 후 워커 파일명이 해시 포함 string literal로 존재한다", async () => {
      const source = `const url = import.meta.resolve("./workers/test.worker");`;
      const filePath = path.join(tmpDir, "src", "main.ts");
      const outdir = path.join(tmpDir, "dist-common2");

      const result = await transformWorkerPaths(source, filePath, outdir, {
        format: "esm",
        platform: "node",
        logLevel: "silent",
      });

      expect(result).toMatch(/["']\.\/workers\/test\.worker-[a-f0-9]+\.js["']/);
    });

    it("변환 후 import.meta.url이 유지된다", async () => {
      const source = `const url = import.meta.resolve("./workers/test.worker");`;
      const filePath = path.join(tmpDir, "src", "main.ts");
      const outdir = path.join(tmpDir, "dist-common3");

      const result = await transformWorkerPaths(source, filePath, outdir, {
        format: "esm",
        platform: "node",
        logLevel: "silent",
      });

      expect(result).toContain("import.meta.url");
    });
  });

  it("매칭 없으면 원본을 그대로 반환한다", async () => {
    const source = `const x = 42;`;
    const result = await transformWorkerPaths(source, "/tmp/main.ts", "/tmp/dist", {});
    expect(result).toBe(source);
  });

  it("워커 내용 변경 시 다른 hash가 생성된다", async () => {
    const source = `import.meta.resolve("./workers/test.worker")`;
    const filePath = path.join(tmpDir, "src", "main.ts");
    const outdir = path.join(tmpDir, "dist-hash-test");
    const workerPath = path.join(tmpDir, "src", "workers", "test.worker.ts");

    // 첫 번째 변환
    fs.writeFileSync(workerPath, "self.onmessage = () => { self.postMessage('v1'); };");
    const result1 = await transformWorkerPaths(source, filePath, outdir, {
      format: "esm",
      platform: "browser",
      logLevel: "silent",
    });
    const hash1 = result1.match(/test\.worker-([a-f0-9]+)\.js/)?.[1];

    // 워커 내용 변경 후 두 번째 변환
    fs.writeFileSync(workerPath, "self.onmessage = () => { self.postMessage('v2-changed'); };");
    const result2 = await transformWorkerPaths(source, filePath, outdir, {
      format: "esm",
      platform: "browser",
      logLevel: "silent",
    });
    const hash2 = result2.match(/test\.worker-([a-f0-9]+)\.js/)?.[1];

    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    expect(hash1).not.toBe(hash2);
  });
});
