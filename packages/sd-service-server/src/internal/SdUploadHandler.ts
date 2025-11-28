import * as path from "path";
import * as fs from "fs";
import { Uuid } from "@simplysm/sd-core-common";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import { SdServiceServer } from "../SdServiceServer";
import { FastifyInstance } from "fastify";
import { pipeline } from "stream/promises";

export class SdUploadHandler {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdUploadHandler"]);

  constructor(private readonly _server: SdServiceServer) {}

  bind(server: FastifyInstance) {
    server.post("/upload", async (req, reply) => {
      const parts = req.parts();
      const result: { path: string; filename: string; size: number }[] = [];
      const uploadDir = path.resolve(this._server.options.rootPath, "www", "uploads");

      if (!FsUtils.exists(uploadDir)) {
        await FsUtils.mkdirsAsync(uploadDir);
      }

      for await (const part of parts) {
        if (part.type === "file") {
          const saveName = `${Uuid.new().toString()}${path.extname(part.filename)}`;
          const savePath = path.join(uploadDir, saveName);

          await pipeline(part.file, fs.createWriteStream(savePath));

          const stats = fs.statSync(savePath);
          result.push({
            path: `uploads/${saveName}`,
            filename: part.filename,
            size: stats.size,
          });
        }
      }

      return result;
    });
  }
}
