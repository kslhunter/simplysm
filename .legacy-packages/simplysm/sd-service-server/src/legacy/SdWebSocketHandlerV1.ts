import type { WebSocket } from "ws";
import type { Type } from "@simplysm/sd-core-common";
import { SdLogger } from "@simplysm/sd-core-node";
import { SdServiceSocketV1 } from "./SdServiceSocketV1";
import type { SdServiceExecutor } from "../core/SdServiceExecutor";
import type { ISdServiceRequest, TSdServiceResponse } from "./protocol-v1.types";
import { SdServiceCommandHelperV1 } from "./SdServiceCommandHelperV1";
import { SD_SERVICE_SPECIAL_COMMANDS } from "./command-v1.types";
import type { SdServiceEventListenerBase } from "@simplysm/sd-service-common";

/** @deprecated */
export class SdWebSocketHandlerV1 {
  private readonly _logger = SdLogger.get(["simplysm", "sd-service-server", "SdWebsocketHandler"]);

  private readonly _socketMap = new Map<string, SdServiceSocketV1>();

  constructor(private readonly _executor: SdServiceExecutor) {}

  async addSocket(socket: WebSocket, remoteAddress: string | undefined) {
    try {
      const serviceSocket = new SdServiceSocketV1(socket);
      const clientId = await serviceSocket.getClientIdAsync();

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

      serviceSocket.on("request", async (request) => {
        this._logger.debug("요청 수신", request);
        const res = await this._processRequestAsync(serviceSocket, request);
        const sentSize = serviceSocket.send(res);
        this._logger.debug(`응답 전송 (size: ${sentSize})`);
      });

      // 연결 로그
      this._logger.debug(`클라이언트 연결됨`, {
        clientId,
        remoteAddress,
        socketSize: this._socketMap.size,
      });

      // 클라이언트에게 연결 완료 알림
      serviceSocket.send({ name: "connected" });
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

  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>) {
    for (const serviceSocket of this._socketMap.values()) {
      serviceSocket.send({ name: "client-reload", clientName, changedFileSet });
    }
  }

  emit<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ) {
    const targetKeys = this._getListenerInfos(eventType.name)
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    this._emitToTargets(targetKeys, data);
  }

  private _getListenerInfos(eventName: string): { key: string; info: any }[] {
    return Array.from(this._socketMap.values()).mapMany((serviceSocket) =>
      serviceSocket.getEventListners(eventName),
    );
  }

  private _emitToTargets(targetKeys: string[], data: any) {
    for (const serviceSocket of this._socketMap.values()) {
      serviceSocket.emitByKeys(targetKeys, data);
    }
  }

  private async _processRequestAsync(
    serviceSocket: SdServiceSocketV1,
    req: ISdServiceRequest,
  ): Promise<TSdServiceResponse> {
    try {
      const methodCmdInfo = SdServiceCommandHelperV1.parseMethodCommand(req.command);

      if (methodCmdInfo) {
        const result = await this._executor.runMethodAsync({
          serviceName: methodCmdInfo.serviceName,
          methodName: methodCmdInfo.methodName,
          params: req.params,

          v1: {
            socket: serviceSocket,
            request: req,
          },
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
          body: this._getListenerInfos(eventName),
        };
      } else if (req.command === SD_SERVICE_SPECIAL_COMMANDS.EMIT_EVENT) {
        const [targetKeys, data] = req.params as [string[], any];

        this._emitToTargets(targetKeys, data);

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
