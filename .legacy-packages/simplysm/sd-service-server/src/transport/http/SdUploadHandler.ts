import * as path from "path";
import { pipeline } from "stream/promises"; // Node.js 내장 파이프라인
import { Uuid } from "@simplysm/sd-core-common";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import type { SdServiceServer } from "../../SdServiceServer";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ISdServiceUploadResult } from "@simplysm/sd-service-common";
import type { SdServiceJwtManager } from "../../auth/SdServiceJwtManager";

export class SdUploadHandler {
  private readonly _logger = SdLogger.get(["simplysm", "sd-service-server", "SdUploadHandler"]);

  constructor(
    private readonly _server: SdServiceServer,
    private readonly _jwt: SdServiceJwtManager,
  ) {}

  async handleAsync(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    // @fastify/multipart가 등록되어 있으면 req.parts() 사용 가능
    if (!req.isMultipart()) {
      reply.status(400).send("Multipart request expected");
      return;
    }

    // 인증 검사
    try {
      const authHeader = req.headers.authorization;
      if (authHeader == null) {
        // 업로드는 로그인 필수
        throw new Error("인증 토큰이 없습니다.");
      }
      const token = authHeader.split(" ")[1];
      await this._jwt.verifyAsync(token);
    } catch (err) {
      reply
        .status(401)
        .send({ error: "Unauthorized", message: err instanceof Error ? err.message : String(err) });
      return;
    }

    const result: ISdServiceUploadResult[] = [];
    const uploadDir = path.resolve(this._server.options.rootPath, "www", "uploads");

    await FsUtils.mkdirsAsync(uploadDir);

    // 현재 처리 중인 파일 경로 (에러 발생 시 삭제용)
    let currentSavePath: string | undefined;

    try {
      // 업로드된 파트(파일/필드)를 순회
      for await (const part of req.parts()) {
        if (part.type === "file") {
          const originalFilename = part.filename;
          const extension = path.extname(originalFilename);
          const saveName = `${Uuid.new().toString()}${extension}`;
          currentSavePath = path.join(uploadDir, saveName);

          // 스트림 파이프라이닝 (파일 저장)
          await pipeline(part.file, FsUtils.createWriteStream(currentSavePath));

          // 파일 크기 제한(Limit)에 걸려 잘린 경우인지 체크
          if (part.file.truncated) {
            throw new Error(`File limit exceeded: ${originalFilename}`);
          }

          // 저장 후 사이즈 확인
          const stats = await FsUtils.statAsync(currentSavePath);

          result.push({
            path: `uploads/${saveName}`,
            filename: originalFilename,
            size: stats.size,
          });

          // 처리 완료 후 변수 초기화 (다음 루프를 위해)
          currentSavePath = undefined;
        }
      }

      // 처리 완료 후 JSON 응답
      reply.send(result);
    } catch (err) {
      this._logger.error("Upload Error", err);

      // 찌꺼기 파일 정리 (Cleanup)
      if (currentSavePath != null) {
        await FsUtils.removeAsync(currentSavePath).catch(() => {});
        this._logger.warn(`Incomplete file deleted: ${currentSavePath}`);
      }

      reply.code(500).send("Upload Failed");
    }
  }
}
