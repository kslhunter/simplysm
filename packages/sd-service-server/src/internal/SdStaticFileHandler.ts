import * as path from "path";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import { SdServiceServer } from "../SdServiceServer";
import { FastifyReply, FastifyRequest } from "fastify";

export class SdStaticFileHandler {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdStaticFileHandler"]);

  constructor(private readonly _server: SdServiceServer) {}

  async handleAsync(req: FastifyRequest, reply: FastifyReply, urlPath: string) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      const errorMessage = "요청이 잘못되었습니다.";
      this.#responseErrorHtml(reply, 405, errorMessage);
      this.#logger.warn(`[405] ${errorMessage} (${req.method})`);
      return;
    }

    // 타겟 파일 경로 결정 (포트 프록시는 상위에서 처리됨)
    let targetFilePath: string;

    // pathProxy 중 값이 string인 것(경로 별칭)만 찾음
    const currPathProxyFrom = Object.keys(this._server.pathProxy).single(
      (from) => urlPath.startsWith(from) && typeof this._server.pathProxy[from] === "string",
    );

    if (currPathProxyFrom !== undefined) {
      // [CASE A] 경로 매핑 (다른 폴더의 파일 서빙)
      const mappedPath = this._server.pathProxy[currPathProxyFrom] as string;
      targetFilePath = path.resolve(mappedPath + urlPath.substring(currPathProxyFrom.length));
    } else {
      // [CASE B] 기본 www 폴더
      targetFilePath = path.resolve(this._server.options.rootPath, "www", urlPath);
    }

    // 디렉토리면 index.html로 변경
    if (FsUtils.exists(targetFilePath) && FsUtils.stat(targetFilePath).isDirectory()) {
      targetFilePath = path.resolve(targetFilePath, "index.html");
    }

    // targetPath 보안 방어 (../../이런거 오면 root밖으로 나갈수 있음.. 그걸 방어함)
    if (
      process.env["NODE_ENV"] === "production" &&
      !targetFilePath.startsWith(path.resolve(this._server.options.rootPath))
    ) {
      throw new Error("Access denied");
    }

    // 파일 전송
    const filename = path.basename(targetFilePath);
    const directory = path.dirname(targetFilePath);

    try {
      return await reply.sendFile(filename, directory);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        const errorMessage = "파일을 찾을 수 없습니다.";
        this.#responseErrorHtml(reply, 404, errorMessage);
        this.#logger.warn(`[404] ${errorMessage} (${targetFilePath})`);
      } else {
        const errorMessage = "파일 전송 중 오류가 발생했습니다.";
        this.#responseErrorHtml(reply, 500, errorMessage);
        this.#logger.error(`[500] ${errorMessage}`, err);
      }
    }
  }

  #responseErrorHtml(reply: FastifyReply, code: number, message: string) {
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
