import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { transformWorkerPaths } from "../../src/pkg-builders/commons/SdWorkerPathPlugin";
import path from "path";
import fs from "fs";
import os from "os";

/**
 * .js 핸들러가 사용하는 transformWorkerPaths의 .js 파일 처리를 검증하는 Unit Test.
 * transformWorkerPaths는 이미 .ts 파일에 대해 테스트되어 있으므로,
 * .js 파일에서도 동일하게 동작하는지 검증한다.
 */
describe("transformWorkerPaths .js 파일 지원", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-worker-js-unit-"));

    const workersDir = path.join(tmpDir, "src", "workers");
    fs.mkdirSync(workersDir, { recursive: true });
    fs.writeFileSync(
      path.join(workersDir, "client-protocol.worker.js"),
      "self.onmessage = (e) => { self.postMessage('ok'); };",
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it(".js 파일 경로에서 import.meta.resolve 워커 패턴이 정상 변환된다", async () => {
    const source = `const url = import.meta.resolve("./workers/client-protocol.worker");`;
    const filePath = path.join(tmpDir, "src", "protocol.js");
    const outdir = path.join(tmpDir, "dist-js");

    const result = await transformWorkerPaths(source, filePath, outdir, {
      format: "esm",
      platform: "browser",
      logLevel: "silent",
    });

    expect(result).toMatch(
      /new URL\(["']\.\/workers\/client-protocol\.worker-[a-f0-9]+\.js["'], import\.meta\.url\)\.href/,
    );
    expect(result).not.toContain("import.meta.resolve");
  });

  it(".js 파일에서 워커 패턴이 없으면 원본 그대로 반환된다", async () => {
    const source = `const x = 42; export default x;`;
    const filePath = path.join(tmpDir, "src", "normal.js");
    const outdir = path.join(tmpDir, "dist-js-no-pattern");

    const result = await transformWorkerPaths(source, filePath, outdir, {
      format: "esm",
      platform: "browser",
      logLevel: "silent",
    });

    expect(result).toBe(source);
  });

  it(".js 파일에서 여러 워커 패턴이 동시에 변환된다", async () => {
    // 두 번째 워커 파일 추가
    const workersDir = path.join(tmpDir, "src", "workers");
    fs.writeFileSync(
      path.join(workersDir, "decode.worker.js"),
      "self.onmessage = (e) => { self.postMessage('decode'); };",
    );

    const source = [
      `const url1 = import.meta.resolve("./workers/client-protocol.worker");`,
      `const url2 = import.meta.resolve("./workers/decode.worker");`,
    ].join("\n");
    const filePath = path.join(tmpDir, "src", "multi.js");
    const outdir = path.join(tmpDir, "dist-js-multi");

    const result = await transformWorkerPaths(source, filePath, outdir, {
      format: "esm",
      platform: "browser",
      logLevel: "silent",
    });

    expect(result).not.toContain("import.meta.resolve");
    expect(result).toMatch(/client-protocol\.worker-[a-f0-9]+\.js/);
    expect(result).toMatch(/decode\.worker-[a-f0-9]+\.js/);
  });
});
