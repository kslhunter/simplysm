import * as http from "http";
import * as path from "path";
import mime from "mime";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import { SdServiceServer } from "../SdServiceServer";

export class SdStaticFileHandler {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdStaticFileHandler"]);

  constructor(private readonly _server: SdServiceServer) {}

  async handleAsync(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    urlPath: string,
  ): Promise<void> {
    if (req.method !== "GET") {
      const errorMessage = "요청이 잘못되었습니다.";
      this.#responseErrorHtml(res, 405, errorMessage);
      this.#logger.warn(`[405] ${errorMessage} (${req.method!.toUpperCase()})`);
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

    // 2. 디렉토리면 index.html로
    targetFilePath =
      FsUtils.exists(targetFilePath) && FsUtils.stat(targetFilePath).isDirectory()
        ? path.resolve(targetFilePath, "index.html")
        : targetFilePath;

    // 3. 파일 존재 여부 확인
    if (!FsUtils.exists(targetFilePath)) {
      const errorMessage = "파일을 찾을 수 없습니다.";
      this.#responseErrorHtml(res, 404, errorMessage);
      this.#logger.warn(`[404] ${errorMessage} (${targetFilePath})`);
      return;
    }

    // 4. 권한 확인 (숨김 파일 등)
    if (path.basename(targetFilePath).startsWith(".")) {
      const errorMessage = "파일을 사용할 권한이 없습니다.";
      this.#responseErrorHtml(res, 403, errorMessage);
      this.#logger.warn(`[403] ${errorMessage} (${targetFilePath})`);
      return;
    }

    // 5. 파일 전송
    const fileStream = FsUtils.createReadStream(targetFilePath);
    const targetFileSize = (await FsUtils.lstatAsync(targetFilePath)).size;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Length", targetFileSize);
    res.setHeader("Content-Type", mime.getType(targetFilePath)!);
    res.writeHead(200);
    fileStream.pipe(res);
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
