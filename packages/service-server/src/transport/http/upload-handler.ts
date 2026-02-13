import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Uuid } from "@simplysm/core-common";
import { fsMkdir, fsStat, fsRm } from "@simplysm/core-node";
import type { ServiceServer } from "../../service-server";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ServiceUploadResult } from "@simplysm/service-common";
import type { JwtManager } from "../../auth/jwt-manager";
import consola from "consola";

const logger = consola.withTag("service-server:UploadHandler");

export class UploadHandler {
  constructor(
    private readonly _server: ServiceServer,
    private readonly _jwt: JwtManager,
  ) {}

  async handle(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!req.isMultipart()) {
      reply.status(400).send("Multipart request expected");
      return;
    }

    // 인증 검사
    try {
      const authHeader = req.headers.authorization;
      if (authHeader == null) {
        throw new Error("인증 토큰이 없습니다.");
      }
      const token = authHeader.split(" ")[1];
      await this._jwt.verify(token);
    } catch (err) {
      reply.status(401).send({
        error: "Unauthorized",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    const result: ServiceUploadResult[] = [];
    const uploadDir = path.resolve(this._server.options.rootPath, "www", "uploads");

    await fsMkdir(uploadDir);

    let currentSavePath: string | undefined;

    try {
      for await (const part of req.parts()) {
        if (part.type === "file") {
          const originalFilename = part.filename;
          const extension = path.extname(originalFilename);
          const saveName = `${Uuid.new().toString()}${extension}`;
          currentSavePath = path.join(uploadDir, saveName);

          await pipeline(part.file, createWriteStream(currentSavePath));

          if (part.file.truncated) {
            throw new Error(`File limit exceeded: ${originalFilename}`);
          }

          const stats = await fsStat(currentSavePath);

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
      logger.error("Upload Error", err);

      if (currentSavePath != null) {
        await fsRm(currentSavePath).catch(() => {});
        logger.warn(`Incomplete file deleted: ${currentSavePath}`);
      }

      reply.code(500).send("Upload Failed");
    }
  }
}
