import type { WebSocket } from "ws";
import type { Type } from "@simplysm/core-common";
import { Uuid } from "@simplysm/core-common";
import type { ServiceEventListener, ServiceClientMessage } from "@simplysm/service-common";
import type { ServiceExecutor } from "../../core/service-executor";
import { ServiceSocket } from "./service-socket";
import type { JwtManager } from "../../auth/jwt-manager";
import type { FastifyRequest } from "fastify";
import consola from "consola";

const logger = consola.withTag("service-server:WebSocketHandler");

export class WebSocketHandler {
  private readonly _socketMap = new Map<string, ServiceSocket>();

  constructor(
    private readonly _executor: ServiceExecutor,
    private readonly _jwt: JwtManager,
  ) {}

  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest) {
    try {
      const serviceSocket = new ServiceSocket(socket, clientId, clientName, connReq);

      // 기존 연결 끊기
      const prevServiceSocket = this._socketMap.get(clientId);
      if (prevServiceSocket != null) {
        prevServiceSocket.close();

        const connectionDateTimeText = prevServiceSocket.connectedAtDateTime.toFormatString("yyyy:MM:dd HH:mm:ss.fff");
        logger.debug(`클라이언트 기존연결 끊음: ${clientId}: ${connectionDateTimeText}`);
      }

      this._socketMap.set(clientId, serviceSocket);

      serviceSocket.on("close", (code) => {
        logger.debug(`클라이언트 연결 끊김: (code: ${code})`);

        if (this._socketMap.get(clientId) !== serviceSocket) return;
        this._socketMap.delete(clientId);
      });

      serviceSocket.on("message", async ({ uuid, msg }) => {
        logger.debug("요청 수신", msg);
        const sentSize = await this._processRequest(serviceSocket, uuid, msg);
        logger.debug(`응답 전송 (size: ${sentSize})`);
      });

      logger.debug("클라이언트 연결됨", {
        clientId,
        remoteAddress: connReq.socket.remoteAddress,
        socketSize: this._socketMap.size,
      });
    } catch (err) {
      logger.error("연결 처리 중 오류 발생", err);
      socket.terminate();
    }
  }

  closeAll() {
    for (const serviceSocket of this._socketMap.values()) {
      serviceSocket.close();
    }
  }

  async broadcastReload(clientName: string | undefined, changedFileSet: Set<string>) {
    for (const serviceSocket of this._socketMap.values()) {
      await serviceSocket.send(Uuid.new().toString(), {
        name: "reload",
        body: {
          clientName,
          changedFileSet,
        },
      });
    }
  }

  async emitToServer<T extends ServiceEventListener<unknown, unknown>>(
    eventType: Type<T>,
    infoSelector: (item: T["$info"]) => boolean,
    data: T["$data"],
  ) {
    const eventName = eventType.prototype.eventName as string;
    const targetKeys = Array.from(this._socketMap.values())
      .flatMap((subSock) => subSock.getEventListeners(eventName))
      .filter((item) => infoSelector(item.info as T["$info"]))
      .map((item) => item.key);

    for (const subSock of this._socketMap.values()) {
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
  }

  private async _processRequest(
    serviceSocket: ServiceSocket,
    uuid: string,
    message: ServiceClientMessage,
  ): Promise<number> {
    try {
      if (message.name.includes(".") && Array.isArray(message.body)) {
        const [serviceName, methodName] = message.name.split(".");

        const result = await this._executor.runMethod({
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
        const infos = Array.from(this._socketMap.values()).flatMap((subSock) => subSock.getEventListeners(name));
        return await serviceSocket.send(uuid, { name: "response", body: infos });
      } else if (message.name === "evt:emit") {
        const { keys, data } = message.body as { keys: string[]; data: unknown };

        for (const subSock of this._socketMap.values()) {
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
        const token = message.body;
        serviceSocket.authTokenPayload = await this._jwt.verify(token);
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
        err instanceof Error ? err : new Error(typeof err === "string" ? err : "알 수 없는 오류가 발생하였습니다.");

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
}
