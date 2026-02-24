import path from "path";
import { fsExists, fsStat, pathIsChildPath } from "@simplysm/core-node";
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

  // Security guard for targetPath (prevent path traversal)
  if (targetFilePath !== allowedRootPath && !pathIsChildPath(targetFilePath, allowedRootPath)) {
    throw new Error("Access denied");
  }

  // Redirect with trailing slash for directories (standard web server behavior)
  if ((await fsExists(targetFilePath)) && (await fsStat(targetFilePath)).isDirectory()) {
    if (!urlPath.endsWith("/")) {
      const urlObj = new URL(req.raw.url!, "http://localhost");
      reply.redirect(urlObj.pathname + "/" + urlObj.search);
      return;
    }
    targetFilePath = path.resolve(targetFilePath, "index.html");
  }

  // Permission check (hidden files, etc.)
  if (path.basename(targetFilePath).startsWith(".")) {
    const errorMessage = "파일을 사용할 권한이 없습니다.";
    responseErrorHtml(reply, 403, errorMessage);
    logger.warn(`[403] ${errorMessage} (${targetFilePath})`);
    return;
  }

  // Send file
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
      const errorMessage = "파일 전송 중 오류가 발생했습니다.";
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
