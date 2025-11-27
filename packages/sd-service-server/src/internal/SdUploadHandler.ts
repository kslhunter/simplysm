import * as path from "path";
import * as fs from "fs";
import { pipeline } from "stream/promises"; // Node.js 내장 파이프라인
import { Uuid } from "@simplysm/sd-core-common";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import { SdServiceServer } from "../SdServiceServer";
import { FastifyReply, FastifyRequest } from "fastify";

export class SdUploadHandler {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdUploadHandler"]);

  constructor(private readonly _server: SdServiceServer) {}

  async handleAsync(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    // @fastify/multipart가 등록되어 있으면 req.parts() 사용 가능
    if (!req.isMultipart()) {
      reply.status(400).send("Multipart request expected");
      return;
    }

    const result: { path: string; filename: string; size: number }[] = [];
    const uploadDir = path.resolve(this._server.options.rootPath, "www", "uploads");

    if (!FsUtils.exists(uploadDir)) {
      await FsUtils.mkdirsAsync(uploadDir);
    }

    try {
      // 업로드된 파트(파일/필드)를 순회
      for await (const part of req.parts()) {
        if (part.type === "file") {
          const originalFilename = part.filename;
          const saveName = `${Uuid.new().toString()}${path.extname(originalFilename)}`;
          const savePath = path.join(uploadDir, saveName);

          // 스트림 파이프라이닝 (파일 저장)
          await pipeline(part.file, fs.createWriteStream(savePath));

          // 저장 후 사이즈 확인
          const stats = await fs.promises.stat(savePath);

          result.push({
            path: `uploads/${saveName}`,
            filename: originalFilename,
            size: stats.size,
          });
        }
      }

      // 처리 완료 후 JSON 응답
      reply.header("Content-Type", "application/json; charset=utf-8");
      reply.send(result);
    } catch (err) {
      this.#logger.error("Upload Error", err);
      reply.status(500).send("Upload Failed");
    }
  }
}
