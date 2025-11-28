import * as http from "http";
import * as path from "path";
import * as fs from "fs";
import busboy from "busboy";
import { Uuid } from "@simplysm/sd-core-common";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import { SdServiceServer } from "../SdServiceServer";

export class SdUploadHandler {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdUploadHandler"]);

  constructor(private readonly _server: SdServiceServer) {}

  async handleAsync(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method !== "POST") {
      res.writeHead(405, { Connection: "close" });
      res.end("Only POST requests are allowed");
      return;
    }

    const bb = busboy({ headers: req.headers });
    const result: { path: string; filename: string; size: number }[] = [];

    // 업로드된 파일을 저장할 임시 디렉토리 (설정에 따라 변경 가능)
    const uploadDir = path.resolve(this._server.options.rootPath, "www", "uploads");
    if (!FsUtils.exists(uploadDir)) {
      await FsUtils.mkdirsAsync(uploadDir);
    }

    // 1. 파일 스트림 처리
    bb.on("file", (name, file, info) => {
      const { filename } = info;
      // 파일명 충돌 방지를 위한 UUID 변환
      const saveName = `${Uuid.new().toString()}${path.extname(filename)}`;
      const savePath = path.join(uploadDir, saveName);

      const writeStream = fs.createWriteStream(savePath);

      file.pipe(writeStream);

      writeStream.on("close", () => {
        const stats = fs.statSync(savePath);
        result.push({
          path: `uploads/${saveName}`, // 클라이언트가 접근할 수 있는 상대 경로
          filename: filename,
          size: stats.size,
        });
      });
    });

    // 2. 처리 완료 후 응답
    bb.on("close", () => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result));
    });

    bb.on("error", (err) => {
      this.#logger.error("Upload Error", err);
      res.writeHead(500, { Connection: "close" });
      res.end("Upload Failed");
    });

    // 요청 스트림을 busboy에 연결
    req.pipe(bb);
  }
}
