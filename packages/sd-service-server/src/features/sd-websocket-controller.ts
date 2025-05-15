import https from "https";
import http from "http";
import * as ws from "ws";
import { DateTime, JsonConvert, Type } from "@simplysm/sd-core-common";
import {
  ISdServiceRequest,
  ISdServiceResponse,
  ISdServiceSplitRequest,
  SdServiceEventListenerBase,
  TSdServiceC2SMessage,
  TSdServiceS2CMessage,
} from "@simplysm/sd-service-common";
import { SdLogger } from "@simplysm/sd-core-node";

export class SdWebsocketController {
  private _logger = SdLogger.get(["simplysm", "sd-service-server", "SdWebsocketController"]);

  private _server: ws.WebSocketServer;
  private _pingInterval?: NodeJS.Timeout;

  private _clientInfoMap = new WeakMap<ws.WebSocket, ISdClientInfo>();

  constructor(
    webServer: http.Server | https.Server | undefined,
    private _runServiceMethodAsync: (def: {
      client: ws.WebSocket;
      request: ISdServiceRequest;
      serviceName: string;
      methodName: string;
      params: any[];
    }) => Promise<any>,
  ) {
    this._server = new ws.WebSocketServer({ server: webServer });

    this._server.on("connection", async (client, req) => {
      try {
        // 클라이언트에게 ID 요청
        const clientId = await this._getClientIdAsync(client);

        // 가존 연결 끊기
        for (const prevClient of this._server.clients) {
          const prevClientInfo = this._clientInfoMap.get(prevClient);
          if (!prevClientInfo || prevClientInfo.id !== clientId) continue;

          const connectionDateTimeText
            = prevClientInfo.connectedAtDateTime.toFormatString("yyyy:MM:dd HH:mm:ss.fff");

          this._logger.debug(
            `클라이언트 기존연결 끊기: ${clientId}: ${connectionDateTimeText}`,
          );

          prevClient.terminate();
        }

        // 연결 로그
        this._logger.debug(
          `클라이언트 연결됨: ${clientId}: ${req.socket.remoteAddress}: ${this._server.clients.size}`,
        );

        // 정보 저장
        const clientInfo: ISdClientInfo = {
          id: clientId,
          connectedAtDateTime: new DateTime(),
          remoteAddress: req.socket.remoteAddress,
          isAlive: true,
          listenerInfos: [],
          splitReqCache: new Map()
        };
        this._clientInfoMap.set(client, clientInfo);

        // 메시지 핸들러
        client.on("message", async (msgJson: string) => {
          try {
            const msg = JsonConvert.parse(msgJson) as TSdServiceC2SMessage;
            if (msg.name === "request") {
              await this._onRequestAsync(client, msg);
            }
            else if (msg.name === "request-split") {
              await this._onRequestSplitAsync(client, msg);
            }
          }
          catch (err) {
            this._logger.error("WebSocket 메시지 처리 중 오류 발생", err);
          }
        });

        // 닫힘 핸들러
        client.on("close", (code) => {
          this._logger.debug(
            `클라이언트 연결 끊김: ${clientId}: ${this._server.clients.size}: ${code}`,
          );
        });

        // 퐁 핸들러
        client.on("pong", () => {
          clientInfo.isAlive = true;
        });

        // 클라이언트에게 연결 완료 알림
        this._send(client, { name: "connected" });
      }
      catch (err) {
        this._logger.error("연결 처리 중 오류 발생", err);
        client.terminate();
      }
    });

    // 핑
    clearInterval(this._pingInterval);
    this._pingInterval = setInterval(() => {
      for (const client of this._server.clients) {
        const clientInfo = this._clientInfoMap.get(client);
        if (!clientInfo) continue;

        if (clientInfo.isAlive === false) return client.terminate();

        clientInfo.isAlive = false;
        client.ping();
      }
    }, 10000);
  }

  async closeAsync() {
    clearInterval(this._pingInterval);

    for (const client of this._server.clients) {
      client.terminate();
    }

    await new Promise<void>((resolve, reject) => {
      this._server.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  broadcastReload(changedFileSet: Set<string>) {
    for (const client of this._server.clients) {
      this._send(client, { name: "client-reload", changedFileSet });
    }
  }

  emit<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ) {
    const listenerInfos = Array.from(this._server.clients)
      .mapMany(item => this._clientInfoMap.get(item)?.listenerInfos ?? [])
      .filter((item) => item.eventName === eventType.name)
      .map((item) => ({ key: item.key, info: item.info }));

    const targetKeys = listenerInfos.filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    this._emitToTargets(targetKeys, data);
  }

  private _emitToTargets(targetKeys: string[], data: any) {
    for (const currClient of this._server.clients) {
      for (const listenerInfo of this._clientInfoMap.get(currClient)?.listenerInfos ?? []) {
        if (!targetKeys.includes(listenerInfo.key)) continue;

        if (currClient.readyState === WebSocket.OPEN) {
          const evtMsg: TSdServiceS2CMessage = {
            name: "event",
            key: listenerInfo.key,
            body: data,
          };
          this._send(currClient, evtMsg);
        }
      }
    }
  }

  private async _onRequestSplitAsync(
    client: ws.WebSocket,
    splitReq: ISdServiceSplitRequest,
  ) {
    this._logger.debug("분할요청 받음", splitReq.uuid + "(" + splitReq.index + ")");

    const clientInfo = this._clientInfoMap.get(client)!;
    const splitCacheInfo = clientInfo.splitReqCache.getOrCreate(
      splitReq.uuid,
      { completedSize: 0, data: [] },
    );
    try {
      splitCacheInfo.data[splitReq.index] = splitReq.body;
      splitCacheInfo.completedSize += splitReq.body.length;

      const isCompleted = splitCacheInfo.completedSize === splitReq.fullSize;

      this._send(client, {
        name: "response-for-split",
        reqUuid: splitReq.uuid,
        completedSize: splitCacheInfo.completedSize,
      });

      if (isCompleted) {
        const req = JsonConvert.parse(splitCacheInfo.data.join("")) as ISdServiceRequest;
        await this._onRequestAsync(client, req);
        clientInfo.splitReqCache.delete(splitReq.uuid);
      }
    }
    catch (err) {
      clientInfo.splitReqCache.delete(splitReq.uuid);
      throw err;
    }
  }

  private async _onRequestAsync(client: ws.WebSocket, req: ISdServiceRequest) {
    this._logger.debug("요청 받음", req);

    const res = await this._processRequestAsync(client, req);

    this._logger.debug(`응답 전송 (size: ${Buffer.from(JsonConvert.stringify(res)).length})`);
    this._send(client, res);
  }

  private async _processRequestAsync(
    client: ws.WebSocket,
    req: ISdServiceRequest,
  ): Promise<ISdServiceResponse> {
    try {
      const cmdSplit = req.command.split(".");
      if (cmdSplit.length === 2) {
        const serviceName = cmdSplit[0];
        const methodName = cmdSplit[1];

        const result = await this._runServiceMethodAsync({
          client,
          request: req,
          serviceName: serviceName,
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
      }
      else if (req.command === "addEventListener") {
        const key = req.params[0] as string;
        const eventName = req.params[1] as string;
        const info = req.params[2];

        const clientInfo = this._clientInfoMap.get(client)!;
        clientInfo.listenerInfos.push({ key, eventName, info });

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: undefined,
        };
      }
      else if (req.command === "removeEventListener") {
        const key = req.params[0] as string;

        const clientInfo = this._clientInfoMap.get(client)!;
        clientInfo.listenerInfos.remove((item) => item.key === key);

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: undefined,
        };
      }
      else if (req.command === "getEventListenerInfos") {
        const eventName = req.params[0] as string;

        const body = Array.from(this._server.clients)
          .mapMany(item => this._clientInfoMap.get(item)?.listenerInfos ?? [])
          .filter((item) => item.eventName === eventName)
          .map((item) => ({ key: item.key, info: item.info }));

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body,
        };
      }
      else if (req.command === "emitEvent") {
        const targetKeys = req.params[0] as string[];
        const data = req.params[1];

        this._emitToTargets(targetKeys, data);

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: undefined,
        };
      }
      else {
        // 에러 응답
        return {
          name: "response",
          reqUuid: req.uuid,
          state: "error",
          body: "요청이 잘못되었습니다.",
        };
      }
    }
    catch (err) {
      // 에러 응답
      return {
        name: "response",
        reqUuid: req.uuid,
        state: "error",
        body: err.stack,
      };
    }
  }

  private async _getClientIdAsync(client: ws.WebSocket): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const msgFn = (msgJson: string): void => {
        try {
          const msg = JsonConvert.parse(msgJson) as TSdServiceC2SMessage;
          if (msg.name === "client-get-id-response") {
            client.off("message", msgFn);
            resolve(msg.body);
          }
        }
        catch (err) {
          client.off("message", msgFn);
          reject(err);
        }
      };

      client.on("message", msgFn);

      this._send(client, { name: "client-get-id" });
    });
  }

  private _send(client: ws.WebSocket, cmd: TSdServiceS2CMessage) {
    const cmdJson = JsonConvert.stringify(cmd);

    if (cmd.name === "response" && cmdJson.length > 3 * 1000 * 1000) {
      const splitSize = 300 * 1000;

      let index = 0;
      let currSize = 0;
      while (currSize !== cmdJson.length) {
        const splitBody = cmdJson.substring(currSize, currSize + splitSize - 1);
        const splitReq: TSdServiceS2CMessage = {
          name: "response-split",
          reqUuid: cmd.reqUuid,
          fullSize: cmdJson.length,
          index,
          body: splitBody,
        };
        const splitReqJson = JsonConvert.stringify(splitReq);

        client.send(splitReqJson);

        currSize += splitBody.length;
        index++;
      }
    }
    else {
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
  splitReqCache: Map<string, { completedSize: number; data: string[] }>;
};
