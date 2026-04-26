import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import WebSocket from "ws";
import { createHmrService, type HmrService } from "../../src/dev-server/hmr-service";

describe("createHmrService", () => {
  let httpServer: http.Server;
  let hmrService: HmrService;
  let port: number;

  function setup(templateUpdates?: Map<string, string>): Promise<number> {
    const updates = templateUpdates ?? new Map<string, string>();
    httpServer = http.createServer((req, res) => {
      if (!hmrService.handleRequest(req, res)) {
        res.writeHead(404);
        res.end("Not Found");
      }
    });
    hmrService = createHmrService({
      httpServer,
      basePath: "/app/",
      templateUpdates: updates,
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

  describe("broadcast", () => {
    it("연결된 클라이언트가 없으면 에러 없이 실행된다", async () => {
      await setup();
      expect(() => hmrService.broadcast({ type: "full-reload" })).not.toThrow();
    });

    it("닫힌 클라이언트는 메시지를 수신하지 않는다", async () => {
      await setup();
      const ws = await connectWs();
      ws.close();
      // close 완료 대기
      await new Promise<void>((resolve) => ws.on("close", resolve));

      expect(() => hmrService.broadcast({ type: "full-reload" })).not.toThrow();
    });
  });

  describe("handleRequest", () => {
    it("/@ng/component 경로가 아닌 요청은 false를 반환한다", async () => {
      await setup();
      const res = await fetch(`http://127.0.0.1:${port}/app/main.js`);
      expect(res.status).toBe(404); // handleRequest가 false → 404 반환
    });

    it("basePath 없는 /@ng/component 요청은 false를 반환한다", async () => {
      await setup();
      const res = await fetch(`http://127.0.0.1:${port}/@ng/component?c=test`);
      expect(res.status).toBe(404);
    });

    it("c 파라미터가 없으면 빈 문자열로 조회한다", async () => {
      const updates = new Map<string, string>();
      updates.set("", "empty-id-content");
      await setup(updates);

      const res = await fetch(`http://127.0.0.1:${port}/app/@ng/component`);
      expect(res.status).toBe(200);
      // c 파라미터 없음 → componentId = "" → encodeURIComponent("") = "" → "empty-id-content"
      const body = await res.text();
      expect(body).toBe("empty-id-content");
    });

    it("componentId를 인코딩한 key로 templateUpdates를 조회한다", async () => {
      const updates = new Map<string, string>();
      const rawId = "src/components/my-comp.ts@MyComp";
      updates.set(encodeURIComponent(rawId), "encoded-key-content");
      await setup(updates);

      const res = await fetch(
        `http://127.0.0.1:${port}/app/@ng/component?c=${encodeURIComponent(rawId)}`,
      );
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toBe("encoded-key-content");
    });
  });

  describe("인터페이스 계약", () => {
    it("반환 객체에 onBuildStart가 없다", async () => {
      await setup();
      expect(hmrService).not.toHaveProperty("onBuildStart");
    });
  });

  describe("close", () => {
    it("close 후 WebSocket 연결이 종료된다", async () => {
      await setup();
      const ws = await connectWs();
      const closePromise = new Promise<void>((resolve) => ws.on("close", resolve));

      hmrService.close();
      await closePromise;
      expect(ws.readyState).toBe(WebSocket.CLOSED);
    });
  });
});
