import type { WebSocket } from "ws";
import { Uuid, env, parseBoolEnv } from "@simplysm/core-common";
import type { ServiceEventDef, ServiceClientMessage } from "@simplysm/service-common";
import { createServiceSocket, type ServiceSocket } from "./service-socket";
import { verifyJwt } from "../../auth/jwt-manager";
import type { FastifyRequest } from "fastify";
import { createLogger } from "@simplysm/core-common";

const logger = createLogger("service-server:WebSocketHandler");

/**
 * WebSocket 핸들러 인터페이스
 *
 * 여러 WebSocket 연결을 관리하고, 메시지를 서비스로 라우팅하며,
 * 이벤트 브로드캐스팅을 처리한다.
 */
export interface WebSocketHandler {
  /**
   * 새 WebSocket 연결을 추가한다
   */
  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void;

  /**
   * 모든 활성 연결을 닫는다
   */
  closeAll(): void;

  /**
   * 매칭되는 클라이언트에 이벤트를 발생시킨다
   */
  emit<TEventDef extends ServiceEventDef>(
    eventName: string,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
}

/**
 * WebSocket 핸들러 인스턴스를 생성한다
 *
 * 여러 WebSocket 연결을 관리하고, 메시지를 서비스로 라우팅하며,
 * 이벤트 브로드캐스팅을 처리한다.
 */
export function createWebSocketHandler(
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
  }) => Promise<unknown>,
  jwtSecret: string | undefined,
): WebSocketHandler {
  // -------------------------------------------------------------------
  // 상태
  // -------------------------------------------------------------------

  const socketMap = new Map<string, ServiceSocket>();

  // -------------------------------------------------------------------
  // 헬퍼
  // -------------------------------------------------------------------

  async function processRequest(
    serviceSocket: ServiceSocket,
    uuid: string,
    message: ServiceClientMessage,
  ): Promise<number> {
    try {
      if (message.name.includes(".") && Array.isArray(message.body)) {
        const dotIndex = message.name.indexOf(".");
        const serviceName = message.name.substring(0, dotIndex);
        const methodName = message.name.substring(dotIndex + 1);

        const result = await runMethod({
          serviceName,
          methodName,
          params: message.body,
          socket: serviceSocket,
        });

        return await serviceSocket.send(uuid, { name: "response", body: result });
      } else if (message.name === "evt:add") {
        const { key, name, info } = message.body;
        serviceSocket.addListener(key, name, info);
        return await serviceSocket.send(uuid, { name: "response" });
      } else if (message.name === "evt:remove") {
        const { key } = message.body;
        serviceSocket.removeListener(key);
        return await serviceSocket.send(uuid, { name: "response" });
      } else if (message.name === "evt:gets") {
        const { name } = message.body;
        const infos = Array.from(socketMap.values()).flatMap((subSock) =>
          subSock.getEventListeners(name),
        );
        return await serviceSocket.send(uuid, { name: "response", body: infos });
      } else if (message.name === "evt:emit") {
        const { keys, data } = message.body;

        await Promise.allSettled(
          Array.from(socketMap.values()).map(async (subSock) => {
            const targetKeys = subSock.filterEventTargetKeys(keys);
            if (targetKeys.length > 0) {
              await subSock.send(uuid, {
                name: "evt:on",
                body: { keys: targetKeys, data },
              });
            }
          }),
        );

        return await serviceSocket.send(uuid, { name: "response" });
      } else if (message.name === "auth") {
        if (jwtSecret == null) throw new Error("JWT Secret이 정의되지 않았습니다.");

        const token = message.body;
        serviceSocket.authTokenPayload = await verifyJwt(jwtSecret, token);
        return await serviceSocket.send(uuid, { name: "response" });
      } else {
        const err = new Error("유효하지 않은 요청입니다.");

        return await serviceSocket.send(uuid, {
          name: "error",
          body: {
            name: err.name,
            message: err.message,
            ...(parseBoolEnv(env("DEV")) ? { stack: err.stack } : {}),
            code: "BAD_MESSAGE",
          },
        });
      }
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error(typeof err === "string" ? err : "알 수 없는 에러가 발생했습니다.");

      return serviceSocket.send(uuid, {
        name: "error",
        body: {
          name: error.name,
          message: error.message,
          code: "INTERNAL_ERROR",
          ...(parseBoolEnv(env("DEV")) ? { stack: error.stack } : {}),
        },
      });
    }
  }

  // -------------------------------------------------------------------
  // 공개 API
  // -------------------------------------------------------------------

  return {
    addSocket(
      socket: WebSocket,
      clientId: string,
      clientName: string,
      connReq: FastifyRequest,
    ): void {
      try {
        const serviceSocket = createServiceSocket(socket, clientId, clientName, connReq);

        // 기존 연결 해제
        const prevServiceSocket = socketMap.get(clientId);
        if (prevServiceSocket != null) {
          prevServiceSocket.close();

          const connectionDateTimeText =
            prevServiceSocket.connectedAtDateTime.toFormatString("yyyy:MM:dd HH:mm:ss.fff");
          logger.debug(
            `이전 클라이언트 연결 해제됨: ${clientId}: ${connectionDateTimeText}`,
          );
        }

        socketMap.set(clientId, serviceSocket);

        serviceSocket.on("close", (code) => {
          logger.debug(`클라이언트 연결 해제됨: (code: ${code})`);

          if (socketMap.get(clientId) !== serviceSocket) return;
          socketMap.delete(clientId);
        });

        serviceSocket.on("message", async ({ uuid, msg }) => {
          logger.debug("요청 수신됨", msg);
          const sentSize = await processRequest(serviceSocket, uuid, msg);
          logger.debug(`응답 전송됨 (크기: ${sentSize})`);
        });

        logger.debug("클라이언트 연결됨", {
          clientId,
          remoteAddress: connReq.socket.remoteAddress,
          socketSize: socketMap.size,
        });
      } catch (err) {
        logger.error("연결 처리 중 에러 발생", err);
        socket.terminate();
      }
    },

    closeAll(): void {
      for (const serviceSocket of socketMap.values()) {
        serviceSocket.close();
      }
    },

    async emit<TEventDef extends ServiceEventDef>(
      eventName: string,
      infoSelector: (item: TEventDef["$info"]) => boolean,
      data: TEventDef["$data"],
    ): Promise<void> {
      const targetKeys = Array.from(socketMap.values())
        .flatMap((subSock) => subSock.getEventListeners(eventName))
        .filter((item) => infoSelector(item.info as TEventDef["$info"]))
        .map((item) => item.key);

      await Promise.allSettled(
        Array.from(socketMap.values()).map(async (subSock) => {
          const subTargetKeys = subSock.filterEventTargetKeys(targetKeys);
          if (subTargetKeys.length > 0) {
            await subSock.send(Uuid.generate().toString(), {
              name: "evt:on",
              body: { keys: subTargetKeys, data },
            });
          }
        }),
      );
    },
  };
}
