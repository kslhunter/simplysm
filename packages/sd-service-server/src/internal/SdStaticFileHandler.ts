import * as http from "http";
import * as path from "path";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import { SdServiceServer } from "../SdServiceServer";
import send from "send";

export class SdStaticFileHandler {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdStaticFileHandler"]);

  constructor(private readonly _server: SdServiceServer) {}

  handle(req: http.IncomingMessage, res: http.ServerResponse, urlPath: string) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      const errorMessage = "요청이 잘못되었습니다.";
      this.#responseErrorHtml(res, 405, errorMessage);
      this.#logger.warn(`[405] ${errorMessage} (${req.method})`);
      return;
    }

    // 1. 프록시 및 타겟 파일 경로 결정
    let targetFilePath: string;
    const currPathProxyFrom = Object.keys(this._server.pathProxy).single((from) =>
      urlPath.startsWith(from),
    );

    if (currPathProxyFrom !== undefined) {
      // 포트 번호로 프록시 (다른 서버로 전달)
      if (typeof this._server.pathProxy[currPathProxyFrom] === "number") {
        const proxyReq = http.request(
          {
            port: this._server.pathProxy[currPathProxyFrom],
            path: req.url,
            method: req.method,
            headers: req.headers,
          },
          (proxyRes) => {
            if (proxyRes.statusCode === 404) {
              res.writeHead(404, { "Content-Type": "text/html" });
              res.end("<h1>A custom 404 page</h1>");
              return;
            }
            res.writeHead(proxyRes.statusCode!, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          },
        );
        req.pipe(proxyReq, { end: true });
        return;
      }
      // 경로로 매핑
      else {
        targetFilePath = path.resolve(
          this._server.pathProxy[currPathProxyFrom] + urlPath.substring(currPathProxyFrom.length),
        );
      }
    } else {
      // 기본 www 폴더
      targetFilePath = path.resolve(this._server.options.rootPath, "www", urlPath);
    }

    // 2. 디렉토리면 index.html로 변경 (SPA 지원 등을 위해)
    // send 모듈은 디렉토리 요청 시 에러를 뱉으므로 미리 처리하거나 send 옵션 활용 가능.
    // 기존 로직 존중하여 직접 처리:
    if (FsUtils.exists(targetFilePath) && FsUtils.stat(targetFilePath).isDirectory()) {
      targetFilePath = path.resolve(targetFilePath, "index.html");
    }

    // 3. send 모듈을 이용한 파일 전송 [핵심 변경]
    // send(req, path, options)
    // root 옵션을 주지 않으면 절대 경로로 처리합니다.
    const stream = send(req, targetFilePath, {
      dotfiles: "deny", // 숨김 파일(.env 등) 접근 차단 (보안)
      acceptRanges: true, // Range Request 지원 (동영상 탐색 가능)
      cacheControl: true, // Cache-Control 헤더 자동 생성
      lastModified: true, // Last-Modified 헤더 자동 생성
      etag: true, // ETag 생성
    });

    stream.on("error", (err: any) => {
      if (err.status === 404) {
        const errorMessage = "파일을 찾을 수 없습니다.";
        this.#responseErrorHtml(res, 404, errorMessage);
        this.#logger.warn(`[404] ${errorMessage} (${targetFilePath})`);
      } else if (err.status === 403) {
        const errorMessage = "파일을 사용할 권한이 없습니다.";
        this.#responseErrorHtml(res, 403, errorMessage);
        this.#logger.warn(`[403] ${errorMessage} (${targetFilePath})`);
      } else {
        const errorMessage = "파일 전송 중 오류가 발생했습니다.";
        if (!res.headersSent) {
          this.#responseErrorHtml(res, 500, errorMessage);
        }
        this.#logger.error(`[500] ${errorMessage}`, err);
      }
    });

    stream.pipe(res);
  }

  #responseErrorHtml(res: http.ServerResponse, code: number, message: string): void {
    res.writeHead(code);
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="UTF-8">
    <title>${code}: ${message}</title>
</head>
<body>${code}: ${message}</body>
</html>`);
  }
}
