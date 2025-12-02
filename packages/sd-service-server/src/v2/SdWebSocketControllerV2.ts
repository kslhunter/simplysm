import { WebSocket } from "ws";
import { Type, Uuid } from "@simplysm/sd-core-common";
import { SdServiceEventListenerBase, TSdServiceClientMessage } from "@simplysm/sd-service-common";
import { SdLogger } from "@simplysm/sd-core-node";
import { SdServiceExecutor } from "../internal/SdServiceExecutor";
import { SdServiceSocketV2 } from "./SdServiceSocketV2";

export class SdWebSocketControllerV2 {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdWebsocketHandler"]);

  readonly #socketMap = new Map<string, SdServiceSocketV2>();

  constructor(private readonly _executor: SdServiceExecutor) {}

  addSocket(
    socket: WebSocket,
    clientId: string,
    clientName: string,
    remoteAddress: string | undefined,
  ) {
    try {
      const serviceSocket = new SdServiceSocketV2(socket, clientId, clientName);

      // 기존 연결 끊기
      const prevServiceSocket = this.#socketMap.get(clientId);
      if (prevServiceSocket) {
        prevServiceSocket.close();

        const connectionDateTimeText =
          prevServiceSocket.connectedAtDateTime.toFormatString("yyyy:MM:dd HH:mm:ss.fff");
        this.#logger.debug(`클라이언트 기존연결 끊음: ${clientId}: ${connectionDateTimeText}`);
      }

      // 클라이언트 객체 변경
      this.#socketMap.set(clientId, serviceSocket);

      serviceSocket.on("close", (code: number) => {
        this.#logger.debug(`클라이언트 연결 끊김: (code: ${code})`);

        // clientId에 새로 set된경우, 시간차로 delete되버리지 않도록 client 동일여부 체크
        if (this.#socketMap.get(clientId) !== serviceSocket) return;
        this.#socketMap.delete(clientId);
      });

      serviceSocket.on("message", async (uuid, message) => {
        this.#logger.debug("요청 수신", message);
        const sentSize = await this.#processRequestAsync(serviceSocket, uuid, message);
        this.#logger.debug(`응답 전송 (size: ${sentSize})`);
      });

      // 연결 로그
      this.#logger.debug(`클라이언트 연결됨`, {
        clientId,
        remoteAddress,
        socketSize: this.#socketMap.size,
      });

      // 클라이언트에게 연결 완료 알림
      serviceSocket.send(Uuid.new().toString(), { name: "connected" });
    } catch (err) {
      this.#logger.error("연결 처리 중 오류 발생", err);
      socket.terminate();
    }
  }

  closeAll() {
    for (const serviceSocket of this.#socketMap.values()) {
      serviceSocket.close();
    }
  }

  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>) {
    for (const serviceSocket of this.#socketMap.values()) {
      serviceSocket.send(Uuid.new().toString(), {
        name: "reload",
        body: {
          clientName,
          changedFileSet,
        },
      });
    }
  }

  emit<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ) {
    const targetKeys = Array.from(this.#socketMap.values())
      .mapMany((subSock) => subSock.getEventListners(eventType.name))
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    for (const subSock of this.#socketMap.values()) {
      const subTargetKeys = subSock.filterEventTargetKeys(targetKeys);
      if (subTargetKeys.length > 0) {
        subSock.send(Uuid.new().toString(), {
          name: "evt:on",
          body: {
            keys: subTargetKeys,
            data,
          },
        });
      }
    }
  }

  async #processRequestAsync(
    serviceSocket: SdServiceSocketV2,
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
        return serviceSocket.send(uuid, { name: "response", body: result });
      } else if (message.name === "evt:add") {
        const { key, name, info } = message.body;

        serviceSocket.addEventListener(key, name, info);

        return serviceSocket.send(uuid, { name: "response" });
      } else if (message.name === "evt:remove") {
        const { key } = message.body;

        serviceSocket.removeEventListener(key);

        return serviceSocket.send(uuid, { name: "response" });
      } else if (message.name === "evt:gets") {
        const { name } = message.body;

        const infos = Array.from(this.#socketMap.values()).mapMany((subSock) =>
          subSock.getEventListners(name),
        );

        return serviceSocket.send(uuid, { name: "response", body: infos });
      } else if (message.name === "evt:emit") {
        const { keys, data } = message.body;

        for (const subSock of this.#socketMap.values()) {
          const targetKeys = subSock.filterEventTargetKeys(keys);
          if (targetKeys.length > 0) {
            subSock.send(uuid, {
              name: "evt:on",
              body: {
                keys: targetKeys,
                data,
              },
            });
          }
        }

        return serviceSocket.send(uuid, { name: "response" });
      } else {
        const err = new Error("요청이 잘못되었습니다.");

        // 에러 응답
        return serviceSocket.send(uuid, {
          name: "error",
          body: {
            message: err.message,
            code: "BAD_MESSAGE",
            stack: err.stack,
            detail: "detail" in err ? err.detail : undefined,
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
          message: error.message,
          code: "INTERNAL_ERROR",
          stack: error.stack,
          detail: "detail" in err ? err.detail : undefined,
        },
      });
    }
  }
}
