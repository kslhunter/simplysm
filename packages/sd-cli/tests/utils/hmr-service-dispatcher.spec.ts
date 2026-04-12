import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import WebSocket from "ws";
import type esbuild from "esbuild";
import { createHmrService, type HmrService } from "../../src/dev-server/hmr-service";

describe("HmrService 디스패처 단위 테스트", () => {
  let httpServer: http.Server;
  let hmrService: HmrService;
  let templateUpdates: Map<string, string>;
  let port: number;

  function setup(): Promise<number> {
    templateUpdates = new Map<string, string>();
    httpServer = http.createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    hmrService = createHmrService({
      httpServer,
      basePath: "/app/",
      templateUpdates,
    });
    return new Promise<number>((resolve, reject) => {
      httpServer.listen(0, "127.0.0.1", () => {
        const addr = httpServer.address();
        if (typeof addr === "object" && addr != null) {
          port = addr.port;
          resolve(addr.port);
        } else {
          reject(new Error("포트 감지 실패"));
        }
      });
      httpServer.on("error", reject);
    });
  }

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
      ws.once("message", (data) => {
        resolve(JSON.parse(data.toString()) as Record<string, unknown>);
      });
    });
  }

  function makeMetafile(outputs: Record<string, { bytes: number; entryPoint?: string }>): esbuild.Metafile {
    const result: esbuild.Metafile = { inputs: {}, outputs: {} };
    for (const [key, value] of Object.entries(outputs)) {
      result.outputs[key] = {
        bytes: value.bytes,
        inputs: {},
        imports: [],
        exports: [],
        ...(value.entryPoint != null ? { entryPoint: value.entryPoint } : {}),
      };
    }
    return result;
  }

  describe("onBuildEnd 디바운싱", () => {
    it("100ms 내에 여러 호출이 오면 마지막 metafile로 한 번만 디스패치한다", async () => {
      await setup();
      const ws = await connectWs();
      const messages: Record<string, unknown>[] = [];
      ws.on("message", (data) => {
        messages.push(JSON.parse(data.toString()) as Record<string, unknown>);
      });

      // 빠른 연속 호출
      hmrService.onBuildEnd(makeMetafile({ "dist/main.js": { bytes: 100 } }));
      hmrService.onBuildEnd(makeMetafile({ "dist/main.js": { bytes: 200 } }));
      hmrService.onBuildEnd(makeMetafile({ "dist/main.js": { bytes: 300 } }));

      // 150ms 대기 (디바운스 + 여유)
      await new Promise((r) => setTimeout(r, 150));

      expect(messages).toHaveLength(1);
      expect(messages[0]["type"]).toBe("full-reload"); // 첫 빌드이므로 full-reload

      ws.close();
    });
  });

  describe("변경 없는 리빌드", () => {
    it("출력이 동일하면 full-reload를 전송한다", async () => {
      await setup();
      const metafile = makeMetafile({ "dist/main.js": { bytes: 1000 } });

      // 첫 빌드
      hmrService.onBuildEnd(metafile);
      await new Promise((r) => setTimeout(r, 150));

      // 두 번째 빌드 (동일)
      const ws = await connectWs();
      const msgPromise = waitForMessage(ws);

      templateUpdates.clear();
      hmrService.onBuildEnd(metafile);

      const msg = await msgPromise;
      expect(msg["type"]).toBe("full-reload");

      ws.close();
    });
  });

  describe("component-update에 여러 컴포넌트 ID", () => {
    it("templateUpdates에 여러 entry가 있으면 모든 ID를 전송한다", async () => {
      await setup();
      const ws = await connectWs();
      const msgPromise = waitForMessage(ws);

      templateUpdates.set("id1", "code1");
      templateUpdates.set("id2", "code2");

      hmrService.onBuildEnd(makeMetafile({ "dist/main.js": { bytes: 1000 } }));

      const msg = await msgPromise;
      expect(msg["type"]).toBe("component-update");
      expect(msg["ids"]).toEqual(["id1", "id2"]);

      ws.close();
    });
  });
});
