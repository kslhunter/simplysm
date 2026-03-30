import path from "path";
import { fsx, pathx } from "@simplysm/core-node";
import type { FastifyReply, FastifyRequest } from "fastify";
import consola from "consola";

const logger = consola.withTag("service-server:StaticFileHandler");

export async function handleStaticFile(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  urlPath: string,
): Promise<void> {
  let targetFilePath = path.resolve(rootPath, "www", urlPath);
  const allowedRootPath = path.resolve(rootPath, "www");

  // targetPath 보안 가드 (경로 탐색 공격 방지)
  if (targetFilePath !== allowedRootPath && !pathx.isChildPath(targetFilePath, allowedRootPath)) {
    throw new Error("접근이 거부되었습니다");
  }

  // 디렉토리에 대해 슬래시를 추가하여 리다이렉트 (표준 웹 서버 동작)
  if ((await fsx.exists(targetFilePath)) && (await fsx.stat(targetFilePath)).isDirectory()) {
    if (!urlPath.endsWith("/")) {
      const urlObj = new URL(req.raw.url!, "http://localhost");
      reply.redirect(urlObj.pathname + "/" + urlObj.search);
      return;
    }
    targetFilePath = path.resolve(targetFilePath, "index.html");
  }

  // 권한 확인 (숨김 파일 등)
  if (path.basename(targetFilePath).startsWith(".")) {
    const errorMessage = "이 파일에 접근할 권한이 없습니다.";
    responseErrorHtml(reply, 403, errorMessage);
    logger.warn(`[403] ${errorMessage} (${targetFilePath})`);
    return;
  }

  // 파일 전송
  const filename = path.basename(targetFilePath);
  const directory = path.dirname(targetFilePath);

  try {
    return await reply.sendFile(filename, directory);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "ENOENT") {
      const errorMessage = "파일을 찾을 수 없습니다.";
      responseErrorHtml(reply, 404, errorMessage);
      logger.warn(`[404] ${errorMessage} (${targetFilePath})`);
    } else {
      const errorMessage = "파일 전송 중 에러가 발생했습니다.";
      responseErrorHtml(reply, 500, errorMessage);
      logger.error(`[500] ${errorMessage}`, err);
    }
  }
}

function responseErrorHtml(reply: FastifyReply, code: number, message: string) {
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
