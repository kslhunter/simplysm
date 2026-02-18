import type { WebSocket } from "ws";
import type { Type } from "@simplysm/sd-core-common";
import { Uuid } from "@simplysm/sd-core-common";
import type {
  SdServiceEventListenerBase,
  TSdServiceClientMessage,
} from "@simplysm/sd-service-common";
import { SdLogger } from "@simplysm/sd-core-node";
import type { SdServiceExecutor } from "../../core/SdServiceExecutor";
import { SdServiceSocket } from "./SdServiceSocket";
import type { SdServiceJwtManager } from "../../auth/SdServiceJwtManager";
import type { FastifyRequest } from "fastify";

export class SdWebSocketHandler {
  private readonly _logger = SdLogger.get(["simplysm", "sd-service-server", "SdWebsocketHandler"]);

  private readonly _socketMap = new Map<string, SdServiceSocket>();

  constructor(
    private readonly _executor: SdServiceExecutor,
    private readonly _jwt: SdServiceJwtManager,
  ) {}

  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest) {
    try {
      const serviceSocket = new SdServiceSocket(socket, clientId, clientName, connReq);

      // 기존 연결 끊기
      const prevServiceSocket = this._socketMap.get(clientId);
      if (prevServiceSocket) {
        prevServiceSocket.close();

        const connectionDateTimeText =
          prevServiceSocket.connectedAtDateTime.toFormatString("yyyy:MM:dd HH:mm:ss.fff");
        this._logger.debug(`클라이언트 기존연결 끊음: ${clientId}: ${connectionDateTimeText}`);
      }

      // 클라이언트 객체 변경
      this._socketMap.set(clientId, serviceSocket);

      serviceSocket.on("close", (code: number) => {
        this._logger.debug(`클라이언트 연결 끊김: (code: ${code})`);

        // clientId에 새로 set된경우, 시간차로 delete되버리지 않도록 client 동일여부 체크
        if (this._socketMap.get(clientId) !== serviceSocket) return;
        this._socketMap.delete(clientId);
      });

      serviceSocket.on("message", async (uuid, message) => {
        this._logger.debug("요청 수신", message);
        const sentSize = await this._processRequestAsync(serviceSocket, uuid, message);
        this._logger.debug(`응답 전송 (size: ${sentSize})`);
      });

      // 연결 로그
      this._logger.debug(`클라이언트 연결됨`, {
        clientId,
        remoteAddress: connReq.socket.remoteAddress,
        socketSize: this._socketMap.size,
      });
    } catch (err) {
      this._logger.error("연결 처리 중 오류 발생", err);
      socket.terminate();
    }
  }

  closeAll() {
    for (const serviceSocket of this._socketMap.values()) {
      serviceSocket.close();
    }
  }

  async broadcastReloadAsync(clientName: string | undefined, changedFileSet: Set<string>) {
    for (const serviceSocket of this._socketMap.values()) {
      await serviceSocket.sendAsync(Uuid.new().toString(), {
        name: "reload",
        body: {
          clientName,
          changedFileSet,
        },
      });
    }
  }

  async emitAsync<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ) {
    const targetKeys = Array.from(this._socketMap.values())
      .mapMany((subSock) => subSock.getEventListners(eventType.name))
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    for (const subSock of this._socketMap.values()) {
      const subTargetKeys = subSock.filterEventTargetKeys(targetKeys);
      if (subTargetKeys.length > 0) {
        await subSock.sendAsync(Uuid.new().toString(), {
          name: "evt:on",
          body: {
            keys: subTargetKeys,
            data,
          },
        });
      }
    }
  }

  private async _processRequestAsync(
    serviceSocket: SdServiceSocket,
    uuid: string,
    message: TSdServiceClientMessage,
  ): Promise<number> {
    try {
      if (message.name.includes(".") && Array.isArray(message.body)) {
        const [serviceName, methodName] = message.name.split(".");

        const result = await this._executor.runMethodAsync({
          serviceName,
          methodName,
          params: message.body,
          socket: serviceSocket,
        });

        // 응답
        return await serviceSocket.sendAsync(uuid, { name: "response", body: result });
      } else if (message.name === "evt:add") {
        const { key, name, info } = message.body;

        serviceSocket.addEventListener(key, name, info);

        return await serviceSocket.sendAsync(uuid, { name: "response" });
      } else if (message.name === "evt:remove") {
        const { key } = message.body;

        serviceSocket.removeEventListener(key);

        return await serviceSocket.sendAsync(uuid, { name: "response" });
      } else if (message.name === "evt:gets") {
        const { name } = message.body;

        const infos = Array.from(this._socketMap.values()).mapMany((subSock) =>
          subSock.getEventListners(name),
        );

        return await serviceSocket.sendAsync(uuid, { name: "response", body: infos });
      } else if (message.name === "evt:emit") {
        const { keys, data } = message.body;

        for (const subSock of this._socketMap.values()) {
          const targetKeys = subSock.filterEventTargetKeys(keys);
          if (targetKeys.length > 0) {
            await subSock.sendAsync(uuid, {
              name: "evt:on",
              body: {
                keys: targetKeys,
                data,
              },
            });
          }
        }

        return await serviceSocket.sendAsync(uuid, { name: "response" });
      } else if (message.name === "auth") {
        const token = message.body;
        serviceSocket.authTokenPayload = await this._jwt.verifyAsync(token);

        return await serviceSocket.sendAsync(uuid, { name: "response" });
      } else {
        const err = new Error("요청이 잘못되었습니다.");

        // 에러 응답
        return await serviceSocket.sendAsync(uuid, {
          name: "error",
          body: {
            name: err.name,
            message: err.message,
            stack: err.stack,
            code: "BAD_MESSAGE",

            ...("detail" in err ? { detail: err.detail } : {}),
            ...("cause" in err ? { cause: err.cause } : {}),
          },
        });
      }
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error(typeof err === "string" ? err : "알 수 없는 오류가 발생하였습니다.");

      return await serviceSocket.sendAsync(uuid, {
        name: "error",
        body: {
          name: error.name,
          message: error.message,
          code: "INTERNAL_ERROR",
          stack: error.stack,

          ...("detail" in error ? { detail: error.detail } : {}),
          ...("cause" in error ? { cause: error.cause } : {}),
        },
      });
    }
  }
}
