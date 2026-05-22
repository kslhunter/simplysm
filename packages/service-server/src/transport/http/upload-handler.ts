import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Uuid } from "@simplysm/core-common";
import { fsx } from "@simplysm/core-node";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ServiceUploadResult } from "@simplysm/service-common";
import { verifyJwt } from "../../auth/jwt-manager";
import { createLogger } from "@simplysm/core-common";

const logger = createLogger("service-server:UploadHandler");

export async function handleUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  jwtSecret: string | undefined,
): Promise<void> {
  if (!req.isMultipart()) {
    reply.status(400).send("Multipart 요청이 필요합니다");
    return;
  }

  // 인증 확인
  try {
    const authHeader = req.headers.authorization;
    if (authHeader == null) {
      throw new Error("인증 토큰이 누락되었습니다.");
    }
    if (jwtSecret == null) {
      throw new Error("JWT Secret이 정의되지 않았습니다.");
    }
    const token = authHeader.split(" ")[1];
    await verifyJwt(jwtSecret, token);
  } catch (err) {
    reply.status(401).send({
      error: "인증 실패",
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  const result: ServiceUploadResult[] = [];
  const uploadDir = path.resolve(rootPath, "www", "uploads");

  await fsx.mkdir(uploadDir);

  let currentSavePath: string | undefined;

  try {
    for await (const part of req.parts()) {
      if (part.type === "file") {
        const originalFilename = part.filename;
        const extension = path.extname(originalFilename);
        const saveName = `${Uuid.generate().toString()}${extension}`;
        currentSavePath = path.join(uploadDir, saveName);

        await pipeline(part.file, createWriteStream(currentSavePath));

        if (part.file.truncated) {
          throw new Error(`파일 크기 제한 초과: ${originalFilename}`);
        }

        const stats = await fsx.stat(currentSavePath);

        result.push({
          path: `uploads/${saveName}`,
          filename: originalFilename,
          size: stats.size,
        });

        currentSavePath = undefined;
      }
    }

    reply.send(result);
  } catch (err) {
    logger.error("업로드 에러", err);

    if (currentSavePath != null) {
      await fsx.rm(currentSavePath).catch(() => {});
      logger.warn(`불완전한 파일 삭제됨: ${currentSavePath}`);
    }

    // 이미 저장된 파일 정리
    for (const savedFile of result) {
      const savedPath = path.resolve(rootPath, "www", savedFile.path);
      await fsx.rm(savedPath).catch(() => {});
      logger.warn(`이미 저장된 파일 삭제됨: ${savedPath}`);
    }

    reply.code(500).send("업로드 실패");
  }
}
