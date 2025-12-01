import http from "http";
import { WebSocket } from "ws";
import { JsonConvert, Type } from "@simplysm/sd-core-common";
import {
  ISdServiceRequest,
  SD_SERVICE_SPECIAL_COMMANDS,
  SdServiceCommandHelper,
  SdServiceEventListenerBase,
  TSdServiceResponse,
} from "@simplysm/sd-service-common";
import { SdLogger } from "@simplysm/sd-core-node";
import { SdServiceSocket } from "./SdServiceSocket";
import { SdServiceExecutor } from "./SdServiceExecutor";

export class SdWebSocketController {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdWebsocketHandler"]);

  readonly #socketMap = new Map<string, SdServiceSocket>();

  constructor(private readonly _executor: SdServiceExecutor) {}

  async addSocket(socket: WebSocket, req: http.IncomingMessage) {
    try {
      const serviceSocket = new SdServiceSocket(socket, req);
      const clientId = await serviceSocket.getClientIdAsync();

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

      serviceSocket.on("request", async (request) => {
        this.#logger.debug("요청 수신", request);
        const res = await this.#processRequestAsync(serviceSocket, request);
        this.#logger.debug(`응답 전송 (size: ${Buffer.from(JsonConvert.stringify(res)).length})`);
        serviceSocket.send(res);
      });

      // 연결 로그
      this.#logger.debug(`클라이언트 연결됨`, {
        clientId: clientId,
        remoteAddress: req.socket.remoteAddress,
        socketSize: this.#socketMap.size,
      });

      // 클라이언트에게 연결 완료 알림
      serviceSocket.send({ name: "connected" });
    } catch (err) {
      this.#logger.error("연결 처리 중 오류 발생", err);
      socket.terminate();
    }
  }

  close() {
    for (const serviceSocket of this.#socketMap.values()) {
      serviceSocket.close();
    }
  }

  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>) {
    for (const serviceSocket of this.#socketMap.values()) {
      serviceSocket.send({ name: "client-reload", clientName, changedFileSet });
    }
  }

  emit<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ) {
    const targetKeys = this.#getListenerInfos(eventType.name)
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    this.#emitToTargets(targetKeys, data);
  }

  #getListenerInfos(eventName: string): { key: string; info: any }[] {
    return Array.from(this.#socketMap.values()).mapMany((serviceSocket) =>
      serviceSocket.getEventListners(eventName),
    );
  }

  #emitToTargets(targetKeys: string[], data: any) {
    for (const serviceSocket of this.#socketMap.values()) {
      serviceSocket.emitByKeys(targetKeys, data);
    }
  }

  async #processRequestAsync(
    serviceSocket: SdServiceSocket,
    req: ISdServiceRequest,
  ): Promise<TSdServiceResponse> {
    try {
      const methodCmdInfo = SdServiceCommandHelper.parseMethodCommand(req.command);

      if (methodCmdInfo) {
        const result = await this._executor.runMethodAsync({
          socket: serviceSocket,
          request: req,
          serviceName: methodCmdInfo.serviceName,
          methodName: methodCmdInfo.methodName,
          params: req.params,
        });

        // 응답
        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: result,
        };
      } else if (req.command === SD_SERVICE_SPECIAL_COMMANDS.ADD_EVENT_LISTENER) {
        const [key, eventName, info] = req.params as [string, string, any];

        serviceSocket.addEventListener(key, eventName, info);

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: undefined,
        };
      } else if (req.command === SD_SERVICE_SPECIAL_COMMANDS.REMOVE_EVENT_LISTENER) {
        const [key] = req.params as [string];

        serviceSocket.removeEventListener(key);

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: undefined,
        };
      } else if (req.command === SD_SERVICE_SPECIAL_COMMANDS.GET_EVENT_LISTENER_INFOS) {
        const [eventName] = req.params as [string];

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: this.#getListenerInfos(eventName),
        };
      } else if (req.command === SD_SERVICE_SPECIAL_COMMANDS.EMIT_EVENT) {
        const [targetKeys, data] = req.params as [string[], any];

        this.#emitToTargets(targetKeys, data);

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: undefined,
        };
      } else {
        const err = new Error("요청이 잘못되었습니다.");

        // 에러 응답
        return {
          name: "response",
          reqUuid: req.uuid,
          state: "error",
          body: {
            message: err.message,
            code: "BAD_COMMAND",
            stack: err.stack,
          },
        };
      }
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error(typeof err === "string" ? err : "알 수 없는 오류가 발생하였습니다.");

      return {
        name: "response",
        reqUuid: req.uuid,
        state: "error",
        body: {
          message: error.message,
          code: "INTERNAL_ERROR",
          stack: error.stack,
        },
      };
    }
  }
}
