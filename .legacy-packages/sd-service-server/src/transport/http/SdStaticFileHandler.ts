import * as path from "path";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import type { SdServiceServer } from "../../SdServiceServer";
import type { FastifyReply, FastifyRequest } from "fastify";

export class SdStaticFileHandler {
  private readonly _logger = SdLogger.get(["simplysm", "sd-service-server", "SdStaticFileHandler"]);

  constructor(private readonly _server: SdServiceServer) {}

  async handleAsync(req: FastifyRequest, reply: FastifyReply, urlPath: string): Promise<void> {
    let targetFilePath = path.resolve(this._server.options.rootPath, "www", urlPath);
    let allowedRootPath = path.resolve(this._server.options.rootPath, "www"); // 보안 검사용 허용 루트

    // 프록시 및 타겟 파일 경로 결정
    if (this._server.options.pathProxy) {
      const currPathProxyFrom = Object.keys(this._server.options.pathProxy).single((from) =>
        urlPath.startsWith(from),
      );

      if (currPathProxyFrom != null) {
        targetFilePath = path.resolve(
          this._server.options.pathProxy[currPathProxyFrom] +
            urlPath.substring(currPathProxyFrom.length),
        );
        allowedRootPath = path.resolve(this._server.options.pathProxy[currPathProxyFrom]);
      }
    }

    // targetPath 보안 방어 (../../이런거 오면 root밖으로 나갈수 있음.. 그걸 방어함)
    if (process.env["NODE_ENV"] === "production" && !targetFilePath.startsWith(allowedRootPath)) {
      throw new Error("Access denied");
    }

    // 디렉토리면 index.html로
    if (FsUtils.exists(targetFilePath) && (await FsUtils.statAsync(targetFilePath)).isDirectory()) {
      targetFilePath = path.resolve(targetFilePath, "index.html");
    }

    // 권한 확인 (숨김 파일 등)
    if (path.basename(targetFilePath).startsWith(".")) {
      const errorMessage = "파일을 사용할 권한이 없습니다.";
      this._responseErrorHtml(reply, 403, errorMessage);
      this._logger.warn(`[403] ${errorMessage} (${targetFilePath})`);
      return;
    }

    // 파일 전송
    const filename = path.basename(targetFilePath);
    const directory = path.dirname(targetFilePath);

    try {
      return await reply.sendFile(filename, directory);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        const errorMessage = "파일을 찾을 수 없습니다.";
        this._responseErrorHtml(reply, 404, errorMessage);
        this._logger.warn(`[404] ${errorMessage} (${targetFilePath})`);
      } else {
        const errorMessage = "파일 전송 중 오류가 발생했습니다.";
        this._responseErrorHtml(reply, 500, errorMessage);
        this._logger.error(`[500] ${errorMessage}`, err);
      }
    }
  }

  private _responseErrorHtml(reply: FastifyReply, code: number, message: string) {
    reply.status(code).type("text/html").send(`
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
