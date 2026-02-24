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
 * V1 legacy client handler (only auto-update supported).
 * All other requests return an upgrade-required error.
 */
export function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: { getLastVersion: (platform: string) => Promise<any> },
  clientNameSetter?: (clientName: string | undefined) => void,
) {
  // Notify connection established
  socket.send(JSON.stringify({ name: "connected" }));

  socket.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString()) as IV1Request;

      // Only allow SdAutoUpdateService.getLastVersion
      if (msg.command === "SdAutoUpdateService.getLastVersion") {
        // Set legacy context
        clientNameSetter?.(msg.clientName);

        const result = autoUpdateMethods.getLastVersion(msg.params[0] as string);

        const response: IV1Response = {
          name: "response",
          reqUuid: msg.uuid,
          state: "success",
          body: result,
        };
        socket.send(JSON.stringify(response));
      } else {
        // All other requests prompt for upgrade
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
      logger.warn("V1 message processing error", err);
    }
  });
}
