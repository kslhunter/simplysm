import type { WebSocket } from "ws";
import type { AutoUpdateService } from "../services/auto-update-service";
import consola from "consola";

const logger = consola.withTag("service-server:V1AutoUpdateHandler");

interface IV1Request {
  uuid: string;
  command: string;
  params: unknown[];
  clientName?: string;
}

interface IV1Response {
  name: "response";
  reqUuid: string;
  state: "success" | "error";
  body: unknown;
}

/**
 * V1 레거시 클라이언트 처리 (auto-update만 지원)
 * 다른 모든 요청은 업그레이드 유도 에러를 반환합니다.
 */
export function handleV1Connection(socket: WebSocket, autoUpdateService: AutoUpdateService) {
  // 연결 완료 알림
  socket.send(JSON.stringify({ name: "connected" }));

  socket.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString()) as IV1Request;

      // SdAutoUpdateService.getLastVersion만 허용
      if (msg.command === "SdAutoUpdateService.getLastVersion") {
        // legacy 컨텍스트 설정
        autoUpdateService.legacy = { clientName: msg.clientName };

        const result = autoUpdateService.getLastVersion(msg.params[0] as string);

        const response: IV1Response = {
          name: "response",
          reqUuid: msg.uuid,
          state: "success",
          body: result,
        };
        socket.send(JSON.stringify(response));
      } else {
        // 다른 모든 요청은 업그레이드 유도
        const response: IV1Response = {
          name: "response",
          reqUuid: msg.uuid,
          state: "error",
          body: {
            message: "앱 업데이트가 필요합니다.",
            code: "UPGRADE_REQUIRED",
          },
        };
        socket.send(JSON.stringify(response));
      }
    } catch (err) {
      logger.warn("V1 메시지 처리 오류", err);
    }
  });
}
