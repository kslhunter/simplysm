import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "path";
import os from "node:os";
import WebSocket from "ws";
import { createDevHttpServer, type DevHttpServer } from "../../src/dev-server/dev-http-server";
import { createHmrService, type HmrService } from "../../src/dev-server/hmr-service";

describe("HMR Service 통합", () => {
  let tmpDir: string;
  let distDir: string;
  let server: DevHttpServer | undefined;
  let hmrService: HmrService | undefined;
  let port: number;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hmr-service-acc-"));
    distDir = path.join(tmpDir, "dist");
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    fs.mkdirSync(distDir, { recursive: true });
  });

  afterEach(async () => {
    hmrService?.close();
    if (server?.port != null) {
      await server.close();
    }
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  async function setupServerWithHmr(
    templateUpdates?: Map<string, string>,
  ): Promise<void> {
    const updates = templateUpdates ?? new Map<string, string>();

    // dev-http-server 먼저 생성 (httpServer 인스턴스 필요)
    server = createDevHttpServer({
      distDir,
      basePath: "/app/",
      port: 0,
      onRequest: (req, res) => hmrService!.handleRequest(req, res),
    });

    // hmrService 생성 (httpServer에 WebSocket 연결)
    hmrService = createHmrService({
      httpServer: server.httpServer,
      basePath: "/app/",
      templateUpdates: updates,
    });

    port = await server.listen();
  }

  function connectWs(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      ws.on("open", () => resolve(ws));
      ws.on("error", reject);
    });
  }

  describe("Scenario: WebSocket 연결 + /@ng/component 통합", () => {
    it("WebSocket으로 연결하고 /@ng/component 엔드포인트에서 templateUpdates 조회가 가능하다", async () => {
      const templateUpdates = new Map<string, string>();
      templateUpdates.set(
        "src/app/app.component.ts@AppComponent",
        'export function AppComponent_UpdateMetadata() {}',
      );

      await setupServerWithHmr(templateUpdates);

      // WebSocket 연결 확인
      const ws = await connectWs();
      expect(ws.readyState).toBe(WebSocket.OPEN);

      // /@ng/component 엔드포인트 확인
      const res = await fetch(
        `http://127.0.0.1:${port}/app/@ng/component?c=${encodeURIComponent("src/app/app.component.ts@AppComponent")}`,
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/javascript");
      expect(res.headers.get("cache-control")).toBe("no-cache");
      const body = await res.text();
      expect(body).toBe('export function AppComponent_UpdateMetadata() {}');

      ws.close();
    });
  });

  describe("Scenario: 다중 클라이언트 브로드캐스트", () => {
    it("3개의 WebSocket 클라이언트에 동시에 메시지를 전송한다", async () => {
      await setupServerWithHmr();

      const clients = await Promise.all([connectWs(), connectWs(), connectWs()]);
      const messages: string[] = [];

      const messagePromises = clients.map(
        (ws) =>
          new Promise<string>((resolve) => {
            ws.on("message", (data) => {
              const msg = data.toString();
              messages.push(msg);
              resolve(msg);
            });
          }),
      );

      // 브로드캐스트
      hmrService!.broadcast({ type: "full-reload" });

      await Promise.all(messagePromises);
      expect(messages).toHaveLength(3);
      for (const msg of messages) {
        expect(JSON.parse(msg)).toEqual({ type: "full-reload" });
      }

      for (const ws of clients) ws.close();
    });
  });

  describe("Scenario: 없는 componentId 요청", () => {
    it("존재하지 않는 componentId 요청 시 200 + 빈 본문을 반환한다", async () => {
      await setupServerWithHmr();

      const res = await fetch(
        `http://127.0.0.1:${port}/app/@ng/component?c=nonexistent`,
      );
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toBe("");
    });
  });
});
