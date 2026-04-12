import http from "node:http";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "path";
import mime from "mime";

export interface DevHttpServerOptions {
  /** dist/ 디렉토리 경로 */
  distDir: string;
  /** basePath (예: "/my-app/") — 항상 /로 시작하고 /로 끝남 */
  basePath: string;
  /** listen 포트 (0: 자동 할당) */
  port: number;
  /** 정적 파일 서빙 전에 실행되는 요청 핸들러. true 반환 시 처리 완료 */
  onRequest?: (req: http.IncomingMessage, res: http.ServerResponse) => boolean;
}

export interface DevHttpServer {
  /** 서버 시작, 실제 할당된 포트 반환 */
  listen(): Promise<number>;
  /** 서버 종료 */
  close(): Promise<void>;
  /** 내부 http.Server 인스턴스 (Feature 2.2에서 WebSocket 연결용) */
  readonly httpServer: http.Server;
  /** listen 후 실제 포트 (listen 전에는 undefined) */
  readonly port: number | undefined;
}

export function createDevHttpServer(options: DevHttpServerOptions): DevHttpServer {
  const { distDir, basePath, port: listenPort, onRequest } = options;

  let actualPort: number | undefined;

  /** stat → 스트리밍 응답. 성공 시 true, ENOENT/디렉토리 시 false, 기타 에러 시 throw */
  async function serveFile(
    filePath: string,
    res: http.ServerResponse,
  ): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(filePath);
      if (stat.isDirectory()) return false;

      const contentType = mime.getType(path.extname(filePath)) ?? "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-cache" });
      await pipeline(fs.createReadStream(filePath), res);
      return true;
    } catch (err) {
      if (res.headersSent) {
        if (!res.writableEnded) res.end();
        return true;
      }
      if (isEnoent(err)) return false;
      throw err;
    }
  }

  async function serveStatic(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    try {
      const url = (req.url ?? "/").split("?")[0];

      // basePath prefix 확인
      if (!url.startsWith(basePath)) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      let relativePath = url.slice(basePath.length);

      // 빈 경로 또는 / → index.html
      if (relativePath === "" || relativePath === "/") {
        relativePath = "index.html";
      }

      // 선행 슬래시 제거
      if (relativePath.startsWith("/")) {
        relativePath = relativePath.slice(1);
      }

      const filePath = path.join(distDir, relativePath);

      // 1. 요청 파일 서빙 시도
      if (await serveFile(filePath, res)) return;

      // 2. SPA fallback: index.html 서빙 시도
      if (await serveFile(path.join(distDir, "index.html"), res)) return;

      // 3. 둘 다 없으면 404
      res.writeHead(404);
      res.end("Not Found");
    } catch {
      if (!res.headersSent) {
        res.writeHead(500);
        res.end("Internal Server Error");
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  }

  function isEnoent(err: unknown): boolean {
    return err != null && typeof err === "object" && "code" in err && (err as { code: string }).code === "ENOENT";
  }

  const httpServer = http.createServer((req, res) => {
    // onRequest 훅: 처리되면 정적 파일 서빙 건너뜀
    if (onRequest != null && onRequest(req, res)) {
      return;
    }
    void serveStatic(req, res);
  });

  return {
    listen(): Promise<number> {
      return new Promise<number>((resolve, reject) => {
        httpServer.listen(listenPort, "0.0.0.0", () => {
          const addr = httpServer.address();
          if (typeof addr === "object" && addr != null) {
            actualPort = addr.port;
            resolve(addr.port);
          } else {
            reject(new Error("HTTP 서버 포트를 감지할 수 없습니다."));
          }
        });
        httpServer.on("error", reject);
      });
    },
    close(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err != null) reject(err);
          else {
            actualPort = undefined;
            resolve();
          }
        });
      });
    },
    get httpServer() {
      return httpServer;
    },
    get port() {
      return actualPort;
    },
  };
}
