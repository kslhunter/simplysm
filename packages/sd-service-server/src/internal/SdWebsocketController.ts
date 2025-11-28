import https from "https";
import http from "http";
import { WebSocket, WebSocketServer } from "ws";
import { DateTime, JsonConvert, Type } from "@simplysm/sd-core-common";
import {
  ISdServiceRequest,
  ISdServiceSplitRequest,
  SD_SERVICE_MAX_MESSAGE_SIZE,
  SD_SERVICE_SPECIAL_COMMANDS,
  SD_SERVICE_SPLIT_MESSAGE_CHUNK_SIZE,
  SdServiceCommandHelper,
  SdServiceEventListenerBase,
  SdServiceSplitMessageAccumulator,
  splitServiceMessage,
  TSdServiceC2SMessage,
  TSdServiceResponse,
  TSdServiceS2CMessage,
} from "@simplysm/sd-service-common";
import { SdLogger } from "@simplysm/sd-core-node";

export class SdWebsocketController {
  #logger = SdLogger.get(["simplysm", "sd-service-server", "SdWebsocketController"]);

  #server: WebSocketServer;
  #pingInterval?: NodeJS.Timeout;

  #clientInfoMap = new WeakMap<WebSocket, ISdClientInfo>();

  constructor(
    webServer: http.Server | https.Server | undefined,
    private _runServiceMethodAsync: (def: {
      client: WebSocket;
      request: ISdServiceRequest;
      serviceName: string;
      methodName: string;
      params: any[];
    }) => Promise<any>,
  ) {
    this.#server = new WebSocketServer({ /*server: webServer*/ noServer: true });

    // 경로 기반 업그레이드 라우팅
    webServer?.on("upgrade", (req, socket, head) => {
      const base = req.headers.host != null ? `http://${req.headers.host}` : "http://localhost";
      const { pathname } = new URL(req.url ?? "/", base);

      if (pathname === "/" || pathname === "/ws") {
        this.#server.handleUpgrade(req, socket, head, (ws) => {
          this.#server.emit("connection", ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    this.#server.on("connection", async (client, req) => {
      try {
        // 클라이언트에게 ID 요청
        const clientId = await this.#getClientIdAsync(client);

        // 기존 연결 끊기
        for (const prevClient of this.#server.clients) {
          const prevClientInfo = this.#clientInfoMap.get(prevClient);
          if (!prevClientInfo || prevClientInfo.id !== clientId) continue;

          const connectionDateTimeText =
            prevClientInfo.connectedAtDateTime.toFormatString("yyyy:MM:dd HH:mm:ss.fff");

          this.#logger.debug(`클라이언트 기존연결 끊기: ${clientId}: ${connectionDateTimeText}`);

          prevClient.terminate();
        }

        // 연결 로그
        this.#logger.debug(
          `클라이언트 연결됨: ${clientId}: ${req.socket.remoteAddress}: ${this.#server.clients.size}`,
        );

        // 정보 저장
        const clientInfo: ISdClientInfo = {
          id: clientId,
          connectedAtDateTime: new DateTime(),
          remoteAddress: req.socket.remoteAddress,
          isAlive: true,
          listenerInfos: [],
          splitAccumulator: new SdServiceSplitMessageAccumulator(),
        };
        this.#clientInfoMap.set(client, clientInfo);

        // 메시지 핸들러
        client.on("message", async (msgJson: string) => {
          try {
            const msg = JsonConvert.parse(msgJson) as TSdServiceC2SMessage;
            if (msg.name === "request") {
              await this.#onRequestAsync(client, msg);
            } else if (msg.name === "request-split") {
              await this.#onRequestSplitAsync(client, msg);
            }
          } catch (err) {
            this.#logger.error("WebSocket 메시지 처리 중 오류 발생", err);
          }
        });

        // 에러 핸들러 (이게 없으면 클라이언트 연결 끊길 때 서버가 죽을 수 있음)
        client.on("error", (err) => {
          this.#logger.error("WebSocket 클라이언트 오류 발생", err);
        });

        // 닫힘 핸들러
        client.on("close", (code) => {
          this.#logger.debug(
            `클라이언트 연결 끊김: ${clientId}: ${this.#server.clients.size}: ${code}`,
          );
        });

        // 퐁 핸들러
        client.on("pong", () => {
          clientInfo.isAlive = true;
        });

        // 클라이언트에게 연결 완료 알림
        this.#send(client, { name: "connected" });
      } catch (err) {
        this.#logger.error("연결 처리 중 오류 발생", err);
        client.terminate();
      }
    });

    // 핑
    clearInterval(this.#pingInterval);
    this.#pingInterval = setInterval(() => {
      for (const client of this.#server.clients) {
        const clientInfo = this.#clientInfoMap.get(client);
        if (!clientInfo) continue;

        if (clientInfo.isAlive === false) return client.terminate();

        clientInfo.isAlive = false;
        client.ping();
      }
    }, 10000);
  }

  async closeAsync() {
    clearInterval(this.#pingInterval);

    for (const client of this.#server.clients) {
      client.terminate();
    }

    await new Promise<void>((resolve, reject) => {
      this.#server.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>) {
    for (const client of this.#server.clients) {
      this.#send(client, { name: "client-reload", clientName, changedFileSet });
    }
  }

  emit<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ) {
    const listenerInfos = Array.from(this.#server.clients)
      .mapMany((item) => this.#clientInfoMap.get(item)?.listenerInfos ?? [])
      .filter((item) => item.eventName === eventType.name)
      .map((item) => ({ key: item.key, info: item.info }));

    const targetKeys = listenerInfos
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    this.#emitToTargets(targetKeys, data);
  }

  #emitToTargets(targetKeys: string[], data: any) {
    for (const currClient of this.#server.clients) {
      for (const listenerInfo of this.#clientInfoMap.get(currClient)?.listenerInfos ?? []) {
        if (!targetKeys.includes(listenerInfo.key)) continue;

        if (currClient.readyState === WebSocket.OPEN) {
          const evtMsg: TSdServiceS2CMessage = {
            name: "event",
            key: listenerInfo.key,
            body: data,
          };
          this.#send(currClient, evtMsg);
        }
      }
    }
  }

  async #onRequestSplitAsync(client: WebSocket, splitReq: ISdServiceSplitRequest) {
    this.#logger.debug("분할요청 받음", splitReq.uuid + "(" + splitReq.index + ")");

    const clientInfo = this.#clientInfoMap.get(client)!;

    try {
      const { completedSize, isCompleted, fullText } = clientInfo.splitAccumulator.push(
        splitReq.uuid,
        splitReq.fullSize,
        splitReq.index,
        splitReq.body,
      );

      this.#send(client, {
        name: "response-for-split",
        reqUuid: splitReq.uuid,
        completedSize,
      });

      if (isCompleted && fullText !== undefined) {
        const req = JsonConvert.parse(fullText) as ISdServiceRequest;
        await this.#onRequestAsync(client, req);
        // push()에서 완료 시 자동으로 해당 uuid entry 삭제됨
      }
    } catch (err) {
      clientInfo.splitAccumulator.clear(splitReq.uuid);
      throw err;
    }
  }

  async #onRequestAsync(client: WebSocket, req: ISdServiceRequest) {
    this.#logger.debug("요청 받음", req);

    const res = await this.#processRequestAsync(client, req);

    this.#logger.debug(`응답 전송 (size: ${Buffer.from(JsonConvert.stringify(res)).length})`);
    this.#send(client, res);
  }

  async #processRequestAsync(
    client: WebSocket,
    req: ISdServiceRequest,
  ): Promise<TSdServiceResponse> {
    try {
      const methodCmdInfo = SdServiceCommandHelper.parseMethodCommand(req.command);
      if (methodCmdInfo) {
        const { serviceName, methodName } = methodCmdInfo;

        const result = await this._runServiceMethodAsync({
          client,
          request: req,
          serviceName,
          methodName,
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
        const key = req.params[0] as string;
        const eventName = req.params[1] as string;
        const info = req.params[2];

        const clientInfo = this.#clientInfoMap.get(client)!;
        clientInfo.listenerInfos.push({ key, eventName, info });

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: undefined,
        };
      } else if (req.command === SD_SERVICE_SPECIAL_COMMANDS.REMOVE_EVENT_LISTENER) {
        const key = req.params[0] as string;

        const clientInfo = this.#clientInfoMap.get(client)!;
        clientInfo.listenerInfos.remove((item) => item.key === key);

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: undefined,
        };
      } else if (req.command === SD_SERVICE_SPECIAL_COMMANDS.GET_EVENT_LISTENER_INFOS) {
        const eventName = req.params[0] as string;

        const body = Array.from(this.#server.clients)
          .mapMany((item) => this.#clientInfoMap.get(item)?.listenerInfos ?? [])
          .filter((item) => item.eventName === eventName)
          .map((item) => ({ key: item.key, info: item.info }));

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body,
        };
      } else if (req.command === SD_SERVICE_SPECIAL_COMMANDS.EMIT_EVENT) {
        const targetKeys = req.params[0] as string[];
        const data = req.params[1];

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
            stack: process.env["NODE_ENV"] !== "production" ? err.stack : undefined,
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
          stack: process.env["NODE_ENV"] !== "production" ? error.stack : undefined,
        },
      };
    }
  }

  async #getClientIdAsync(client: WebSocket): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const msgFn = (msgJson: string): void => {
        try {
          const msg = JsonConvert.parse(msgJson) as TSdServiceC2SMessage;
          if (msg.name === "client-get-id-response") {
            client.off("message", msgFn);
            resolve(msg.body);
          }
        } catch (err) {
          client.off("message", msgFn);
          reject(err);
        }
      };

      client.on("message", msgFn);

      this.#send(client, { name: "client-get-id" });
    });
  }

  #send(client: WebSocket, cmd: TSdServiceS2CMessage) {
    const cmdJson = JsonConvert.stringify(cmd);
    if (cmd.name === "response" && cmdJson.length > SD_SERVICE_MAX_MESSAGE_SIZE) {
      const chunks = splitServiceMessage(cmdJson, SD_SERVICE_SPLIT_MESSAGE_CHUNK_SIZE);

      for (let index = 0; index < chunks.length; index++) {
        const body = chunks[index];
        const splitRes: TSdServiceS2CMessage = {
          name: "response-split",
          reqUuid: cmd.reqUuid,
          fullSize: cmdJson.length,
          index,
          body,
        };
        const splitResJson = JsonConvert.stringify(splitRes);

        this.#logger.debug(`분할응답 전송 (size: ${Buffer.from(splitResJson).length})`);
        client.send(splitResJson);
      }
    } else {
      client.send(cmdJson);
    }
  }
}

interface ISdClientInfo {
  id: string;
  connectedAtDateTime: DateTime;
  remoteAddress: string | undefined;
  isAlive: boolean | undefined;
  listenerInfos: {
    key: string;
    eventName: string;
    info: any;
  }[];
  splitAccumulator: SdServiceSplitMessageAccumulator;
}
