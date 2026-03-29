import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createSdNgPlugin } from "../../src/pkg-builders/client/createSdNgPlugin";
import path from "path";
import fs from "fs";
import os from "os";
import esbuild from "esbuild";

/**
 * createSdNgPlugin의 .js onLoad 핸들러가
 * transformWorkerPaths를 적용하는지 검증하는 Acceptance Test.
 *
 * 플러그인의 setup()을 호출하여 등록된 핸들러를 캡처한 뒤,
 * .js 파일에 대해 핸들러를 직접 호출하여 변환 결과를 검증한다.
 */

interface CapturedHandler {
  filter: RegExp;
  handler: (args: esbuild.OnLoadArgs) => Promise<esbuild.OnLoadResult | null>;
}

function captureOnLoadHandlers(workerOutdir?: string): CapturedHandler[] {
  const captureTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-ng-capture-"));

  // SdTsCompiler가 tsconfig.json을 읽으므로 최소한의 파일을 제공
  fs.writeFileSync(
    path.join(captureTmpDir, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext" } }),
  );

  const plugin = createSdNgPlugin(
    {
      pkgPath: captureTmpDir as any,
      tsConfigPath: path.join(captureTmpDir, "tsconfig.json") as any,
    },
    new Set(),
    { affectedFileSet: new Set(), watchFileSet: new Set() },
    workerOutdir,
  );

  const handlers: CapturedHandler[] = [];
  const mockBuild = {
    initialOptions: {
      format: "esm" as const,
      platform: "browser" as const,
      logLevel: "silent" as const,
      loader: {},
    },
    onStart: () => {},
    onLoad: (opts: { filter: RegExp }, handler: any) => {
      handlers.push({ filter: opts.filter, handler });
    },
    onEnd: () => {},
    resolve: async () => ({ sideEffects: false }),
  };

  plugin.setup(mockBuild as any);
  fs.rmSync(captureTmpDir, { recursive: true, force: true });
  return handlers;
}

describe("createSdNgPlugin .js onLoad 핸들러", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-ng-js-handler-"));

    // 워커 파일 생성
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

  it("npm 패키지의 .js 파일에서 import.meta.resolve 워커 패턴이 변환된다", async () => {
    const workerOutdir = path.join(tmpDir, "dist");
    const handlers = captureOnLoadHandlers(workerOutdir);

    // .js 필터를 가진 핸들러가 등록되어야 한다
    const jsHandler = handlers.find((h) => h.filter.test("test.js") && !h.filter.test("test.mjs"));
    expect(jsHandler).toBeDefined();

    // .js 파일에 import.meta.resolve 워커 패턴이 있는 경우
    const jsFilePath = path.join(tmpDir, "src", "protocol.js");
    fs.writeFileSync(
      jsFilePath,
      `const url = import.meta.resolve("./workers/client-protocol.worker");`,
    );

    const result = await jsHandler!.handler({
      path: jsFilePath,
      namespace: "file",
      suffix: "",
      pluginData: undefined,
      with: {},
    });

    expect(result).not.toBeNull();
    expect(result!.contents).toBeDefined();
    expect(String(result!.contents)).toMatch(
      /new URL\(["']\.\/workers\/client-protocol\.worker-[a-f0-9]+\.js["'], import\.meta\.url\)\.href/,
    );
    expect(String(result!.contents)).not.toContain("import.meta.resolve");
    expect(result!.loader).toBe("js");
  });

  it("워커 패턴이 없는 .js 파일은 null을 반환한다", async () => {
    const workerOutdir = path.join(tmpDir, "dist-no-pattern");
    const handlers = captureOnLoadHandlers(workerOutdir);

    const jsHandler = handlers.find((h) => h.filter.test("test.js") && !h.filter.test("test.mjs"));
    expect(jsHandler).toBeDefined();

    // 워커 패턴이 없는 .js 파일
    const jsFilePath = path.join(tmpDir, "src", "normal.js");
    fs.writeFileSync(jsFilePath, `const x = 42; export default x;`);

    const result = await jsHandler!.handler({
      path: jsFilePath,
      namespace: "file",
      suffix: "",
      pluginData: undefined,
      with: {},
    });

    expect(result).toBeNull();
  });

  it("workerOutdir가 없으면 .js 핸들러가 등록되지 않는다", () => {
    const handlers = captureOnLoadHandlers(undefined);

    // .js 전용 핸들러가 없어야 한다 (기존 .ts, .mjs, otherLoader 필터만 있음)
    const jsOnlyHandler = handlers.find(
      (h) => h.filter.test("test.js") && !h.filter.test("test.ts") && !h.filter.test("test.mjs"),
    );
    expect(jsOnlyHandler).toBeUndefined();
  });

  it("기존 .ts 핸들러가 여전히 등록되어 있다", () => {
    const workerOutdir = path.join(tmpDir, "dist-ts-check");
    const handlers = captureOnLoadHandlers(workerOutdir);

    const tsHandler = handlers.find((h) => h.filter.test("test.ts"));
    expect(tsHandler).toBeDefined();
  });
});
