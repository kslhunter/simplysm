import type { WebSocket } from "ws";
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
 * V1 레거시 클라이언트 핸들러 (자동 업데이트만 지원).
 * 그 외 모든 요청은 업그레이드 필요 에러를 반환한다.
 */
export function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: { getLastVersion: (platform: string) => Promise<any> },
  clientNameSetter?: (clientName: string | undefined) => void,
) {
  // 연결 성립 알림
  socket.send(JSON.stringify({ name: "connected" }));

  socket.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString()) as IV1Request;

      // SdAutoUpdateService.getLastVersion만 허용
      if (msg.command === "SdAutoUpdateService.getLastVersion") {
        // 레거시 컨텍스트 설정
        clientNameSetter?.(msg.clientName);

        const result = await autoUpdateMethods.getLastVersion(msg.params[0] as string);

        const response: IV1Response = {
          name: "response",
          reqUuid: msg.uuid,
          state: "success",
          body: result,
        };
        socket.send(JSON.stringify(response));
      } else {
        // 그 외 모든 요청은 업그레이드 요구
        const response: IV1Response = {
          name: "response",
          reqUuid: msg.uuid,
          state: "error",
          body: {
            message: "앱 업그레이드가 필요합니다.",
            code: "UPGRADE_REQUIRED",
          },
        };
        socket.send(JSON.stringify(response));
      }
    } catch (err) {
      logger.warn("V1 메시지 처리 에러", err);
    }
  });
}
