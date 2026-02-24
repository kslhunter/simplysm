import type { WebSocket } from "ws";
import { Uuid } from "@simplysm/core-common";
import type { ServiceEventDef, ServiceClientMessage } from "@simplysm/service-common";
import { createServiceSocket, type ServiceSocket } from "./service-socket";
import { verifyJwt } from "../../auth/jwt-manager";
import type { FastifyRequest } from "fastify";
import consola from "consola";

const logger = consola.withTag("service-server:WebSocketHandler");

/**
 * WebSocket handler interface
 *
 * Manages multiple WebSocket connections, routes messages to services,
 * and handles event broadcasting.
 */
export interface WebSocketHandler {
  /**
   * Add a new WebSocket connection
   */
  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void;

  /**
   * Close all active connections
   */
  closeAll(): void;

  /**
   * Broadcast reload message to all clients
   */
  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>;

  /**
   * Emit event to server with info filtering
   */
  emitToServer<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
}

/**
 * Create a WebSocket handler instance
 *
 * Manages multiple WebSocket connections, routes messages to services,
 * and handles event broadcasting.
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
  // State
  // -------------------------------------------------------------------

  const socketMap = new Map<string, ServiceSocket>();

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  async function processRequest(
    serviceSocket: ServiceSocket,
    uuid: string,
    message: ServiceClientMessage,
  ): Promise<number> {
    try {
      if (message.name.includes(".") && Array.isArray(message.body)) {
        const [serviceName, methodName] = message.name.split(".");

        const result = await runMethod({
          serviceName,
          methodName,
          params: message.body,
          socket: serviceSocket,
        });

        return await serviceSocket.send(uuid, { name: "response", body: result });
      } else if (message.name === "evt:add") {
        const { key, name, info } = message.body as { key: string; name: string; info: unknown };
        serviceSocket.addEventListener(key, name, info);
        return await serviceSocket.send(uuid, { name: "response" });
      } else if (message.name === "evt:remove") {
        const { key } = message.body as { key: string };
        serviceSocket.removeEventListener(key);
        return await serviceSocket.send(uuid, { name: "response" });
      } else if (message.name === "evt:gets") {
        const { name } = message.body as { name: string };
        const infos = Array.from(socketMap.values()).flatMap((subSock) =>
          subSock.getEventListeners(name),
        );
        return await serviceSocket.send(uuid, { name: "response", body: infos });
      } else if (message.name === "evt:emit") {
        const { keys, data } = message.body as { keys: string[]; data: unknown };

        for (const subSock of socketMap.values()) {
          const targetKeys = subSock.filterEventTargetKeys(keys);
          if (targetKeys.length > 0) {
            await subSock.send(uuid, {
              name: "evt:on",
              body: {
                keys: targetKeys,
                data,
              },
            });
          }
        }

        return await serviceSocket.send(uuid, { name: "response" });
      } else if (message.name === "auth") {
        if (jwtSecret == null) throw new Error("JWT Secret이 정의되지 않았습니다.");

        const token = message.body;
        serviceSocket.authTokenPayload = await verifyJwt(jwtSecret, token);
        return await serviceSocket.send(uuid, { name: "response" });
      } else {
        const err = new Error("요청이 잘못되었습니다.");

        return await serviceSocket.send(uuid, {
          name: "error",
          body: {
            name: err.name,
            message: err.message,
            stack: err.stack,
            code: "BAD_MESSAGE",
          },
        });
      }
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error(typeof err === "string" ? err : "알 수 없는 오류가 발생하였습니다.");

      return serviceSocket.send(uuid, {
        name: "error",
        body: {
          name: error.name,
          message: error.message,
          code: "INTERNAL_ERROR",
          stack: error.stack,
        },
      });
    }
  }

  // -------------------------------------------------------------------
  // Public API
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

        // Disconnect existing connection
        const prevServiceSocket = socketMap.get(clientId);
        if (prevServiceSocket != null) {
          prevServiceSocket.close();

          const connectionDateTimeText =
            prevServiceSocket.connectedAtDateTime.toFormatString("yyyy:MM:dd HH:mm:ss.fff");
          logger.debug(`Disconnected previous client connection: ${clientId}: ${connectionDateTimeText}`);
        }

        socketMap.set(clientId, serviceSocket);

        serviceSocket.on("close", (code) => {
          logger.debug(`Client disconnected: (code: ${code})`);

          if (socketMap.get(clientId) !== serviceSocket) return;
          socketMap.delete(clientId);
        });

        serviceSocket.on("message", async ({ uuid, msg }) => {
          logger.debug("Request received", msg);
          const sentSize = await processRequest(serviceSocket, uuid, msg);
          logger.debug(`Response sent (size: ${sentSize})`);
        });

        logger.debug("Client connected", {
          clientId,
          remoteAddress: connReq.socket.remoteAddress,
          socketSize: socketMap.size,
        });
      } catch (err) {
        logger.error("Error handling connection", err);
        socket.terminate();
      }
    },

    closeAll(): void {
      for (const serviceSocket of socketMap.values()) {
        serviceSocket.close();
      }
    },

    async broadcastReload(
      clientName: string | undefined,
      changedFileSet: Set<string>,
    ): Promise<void> {
      for (const serviceSocket of socketMap.values()) {
        await serviceSocket.send(Uuid.new().toString(), {
          name: "reload",
          body: {
            clientName,
            changedFileSet,
          },
        });
      }
    },

    async emitToServer<TInfo, TData>(
      eventDef: ServiceEventDef<TInfo, TData>,
      infoSelector: (item: TInfo) => boolean,
      data: TData,
    ): Promise<void> {
      const eventName = eventDef.eventName;
      const targetKeys = Array.from(socketMap.values())
        .flatMap((subSock) => subSock.getEventListeners(eventName))
        .filter((item) => infoSelector(item.info as TInfo))
        .map((item) => item.key);

      for (const subSock of socketMap.values()) {
        const subTargetKeys = subSock.filterEventTargetKeys(targetKeys);
        if (subTargetKeys.length > 0) {
          await subSock.send(Uuid.new().toString(), {
            name: "evt:on",
            body: {
              keys: subTargetKeys,
              data,
            },
          });
        }
      }
    },
  };
}
