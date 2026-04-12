import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "path";
import os from "node:os";
import http from "node:http";
import WebSocket from "ws";
import type esbuild from "esbuild";
import { createHmrService, type HmrService } from "../../src/dev-server/hmr-service";

describe("HMR 디스패처 통합", () => {
  let tmpDir: string;
  let httpServer: http.Server;
  let hmrService: HmrService;
  let templateUpdates: Map<string, string>;
  let port: number;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hmr-dispatcher-acc-"));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    templateUpdates = new Map<string, string>();
    httpServer = http.createServer((req, res) => {
      if (!hmrService.handleRequest(req, res)) {
        res.writeHead(404);
        res.end();
      }
    });
    hmrService = createHmrService({
      httpServer,
      basePath: "/app/",
      templateUpdates,
    });
    port = await new Promise<number>((resolve, reject) => {
      httpServer.listen(0, "127.0.0.1", () => {
        const addr = httpServer.address();
        if (typeof addr === "object" && addr != null) resolve(addr.port);
        else reject(new Error("포트 감지 실패"));
      });
      httpServer.on("error", reject);
    });
  });

  afterEach(async () => {
    hmrService.close();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err != null) reject(err);
        else resolve();
      });
    });
  });

  function connectWs(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      ws.on("open", () => resolve(ws));
      ws.on("error", reject);
    });
  }

  function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      ws.on("message", (data) => {
        resolve(JSON.parse(data.toString()) as Record<string, unknown>);
      });
    });
  }

  describe("Scenario: template 변경 → component-update 메시지", () => {
    it("templateUpdates에 entry가 있으면 component-update 메시지를 전송한다", async () => {
      const ws = await connectWs();
      const msgPromise = waitForMessage(ws);

      // templateUpdates 채우기 (createCompilerPlugin이 빌드 중 채움)
      const componentId = encodeURIComponent("src/app/app.component.ts@AppComponent");
      templateUpdates.set(componentId, "export function update() {}");

      // onBuildEnd 호출 (esbuild onEnd에서 호출됨)
      const fakeMetafile: esbuild.Metafile = {
        inputs: {},
        outputs: {
          "dist/main.js": {
            bytes: 1000,
            inputs: {},
            imports: [],
            exports: [],
            entryPoint: "src/main.ts",
          },
        },
      };
      hmrService.onBuildEnd(fakeMetafile);

      // 100ms 디바운스 + 여유
      const msg = await msgPromise;
      expect(msg["type"]).toBe("component-update");
      expect(msg["ids"]).toEqual([componentId]);
      expect(msg["timestamp"]).toBeTypeOf("number");

      ws.close();
    });
  });

  describe("Scenario: TS 로직 변경 → full-reload 메시지", () => {
    it("templateUpdates가 비어있고 JS 출력이 변경되면 full-reload를 전송한다", async () => {
      const ws = await connectWs();
      const msgPromise = waitForMessage(ws);

      // 초기 metafile 설정 (이전 빌드)
      const prevMetafile: esbuild.Metafile = {
        inputs: {},
        outputs: {
          "dist/main.js": {
            bytes: 1000,
            inputs: {},
            imports: [],
            exports: [],
            entryPoint: "src/main.ts",
          },
        },
      };
      hmrService.onBuildEnd(prevMetafile);

      // 첫 번째 메시지 소비 (초기 빌드)
      await msgPromise;

      // 두 번째 빌드: JS 크기 변경
      const ws2 = await connectWs();
      const msgPromise2 = waitForMessage(ws2);

      templateUpdates.clear();
      const newMetafile: esbuild.Metafile = {
        inputs: {},
        outputs: {
          "dist/main.js": {
            bytes: 2000, // 변경됨
            inputs: {},
            imports: [],
            exports: [],
            entryPoint: "src/main.ts",
          },
        },
      };
      hmrService.onBuildEnd(newMetafile);

      const msg2 = await msgPromise2;
      expect(msg2["type"]).toBe("full-reload");

      ws.close();
      ws2.close();
    });
  });

  describe("Scenario: CSS-only 변경 → css-update 메시지", () => {
    it("JS 출력은 동일하고 CSS만 변경되면 css-update를 전송한다", async () => {
      // 초기 빌드
      const prevMetafile: esbuild.Metafile = {
        inputs: {},
        outputs: {
          "dist/main.js": {
            bytes: 1000,
            inputs: {},
            imports: [],
            exports: [],
            entryPoint: "src/main.ts",
          },
          "dist/main.css": {
            bytes: 500,
            inputs: {},
            imports: [],
            exports: [],
          },
        },
      };
      hmrService.onBuildEnd(prevMetafile);

      // 첫 번째 빌드의 100ms 디바운스 완료 대기
      await new Promise((r) => setTimeout(r, 150));

      // 두 번째 빌드: CSS만 변경
      const ws = await connectWs();
      const msgPromise = waitForMessage(ws);

      templateUpdates.clear();
      const newMetafile: esbuild.Metafile = {
        inputs: {},
        outputs: {
          "dist/main.js": {
            bytes: 1000, // 동일
            inputs: {},
            imports: [],
            exports: [],
            entryPoint: "src/main.ts",
          },
          "dist/main.css": {
            bytes: 800, // 변경됨
            inputs: {},
            imports: [],
            exports: [],
          },
        },
      };
      hmrService.onBuildEnd(newMetafile);

      const msg = await msgPromise;
      expect(msg["type"]).toBe("css-update");
      expect(msg["files"]).toContain("main.css");
      expect(msg["timestamp"]).toBeTypeOf("number");

      ws.close();
    });
  });
});
