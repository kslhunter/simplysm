import https from "https";
import http from "http";
import url from "url";
import path from "path";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import { ISdServiceServerOptions, SdServiceBase } from "./types";
import { EventEmitter } from "events";
import { DateTime, JsonConvert, ObjectUtils, Type, Wait } from "@simplysm/sd-core-common";
import { WebSocket, WebSocketServer } from "ws";
import {
  ISdServiceRequest,
  ISdServiceResponse,
  ISdServiceSplitRequest,
  SdServiceEventListenerBase,
  TSdServiceC2SMessage,
  TSdServiceS2CMessage,
} from "@simplysm/sd-service-common";
import mime from "mime";
import { SdWebRequestError } from "./sd-web-request.error";
import { SdServiceServerConfUtils } from "./utils/sd-service-server-conf.utils";

export class SdServiceServer extends EventEmitter {
  public isOpen = false;
  /***
   * 경로 프록시 (브라우저에 입력된 경로를 기본 파일경로가 아닌 다른 파일경로로 바꾸어 리턴함)
   *
   * * from: 서버내 'www' 이후의 상대경로 (절대경로 입력 불가)
   * * to: 서버내 파일의  절대경로 혹은 DEVSERVER의 port
   * * 'from'에 'api'로 시작하는 경로 사용 불가
   *
   */
  public pathProxy: Record</* from */ string, /* to */ string | number> = {};
  private readonly _logger = SdLogger.get(["simplysm", "sd-service-server", this.constructor.name]);
  private _httpServer?: http.Server | https.Server;
  private _wsServer?: WebSocketServer;
  private readonly _splitReqCache = new Map<string, { completedSize: number; data: string[] }>();
  private readonly _eventListeners: IEventListener[] = [];

  // public devMiddlewares?: NextHandleFunction[];
  private _pingInterval?: NodeJS.Timeout;

  public constructor(public readonly options: ISdServiceServerOptions) {
    super();
  }

  public async getWsClientAsync(socketId: string): Promise<TSdWebSocket | undefined> {
    try {
      await Wait.until(
        () => {
          if (!this._wsServer) return false;

          const wsClients = Array.from(this._wsServer.clients).filter(
            (item) => item.readyState === WebSocket.OPEN && item["id"] === socketId,
          );
          if (wsClients.length > 1) {
            this._logger.debug(
              "클라이언트 중복: " +
              socketId +
              ": " +
              wsClients.length +
              "\n" +
              wsClients
                .map((item) => "  - " + item["connectedAtDateTime"].toFormatString(
                  "yyyy:MM:dd HH:mm:ss.fff"))
                .join("\n"),
            );
            return true;
          }
          else {
            return wsClients.length === 1;
          }
        },
        1000,
        3500,
      );
      return Array.from(this._wsServer!.clients).single(
        (item) => item.readyState === WebSocket.OPEN && item["id"] === socketId,
      ) as TSdWebSocket;
    }
    catch (err) {
      this._logger.error("소켓요청을 처리하는 중에 클라이언트 소켓이 끊김", err);

      this._logger.debug("끊긴 소켓의 이벤트 리스너 비우기...");
      const disconnectedListeners = this._eventListeners.filter((item) => item.socketId
        === socketId);
      for (const disconnectedListener of disconnectedListeners) {
        this._eventListeners.remove(disconnectedListener);
      }

      return undefined;
    }
  }

  public getConfig(clientName?: string): Record<string, any | undefined> {
    SdServiceServerConfUtils.getConfig(this.options.rootPath, clientName, this.pathProxy);
    let result: Record<string, any | undefined> = {};

    const rootFilePath = path.resolve(this.options.rootPath, ".config.json");
    if (FsUtils.exists(rootFilePath)) {
      result = FsUtils.readJson(rootFilePath);
    }

    if (clientName !== undefined) {
      const targetPath =
        typeof this.pathProxy[clientName] === "string"
          ? this.pathProxy[clientName]
          : path.resolve(this.options.rootPath, "www", clientName);

      const filePath = path.resolve(targetPath, ".config.json");
      if (FsUtils.exists(filePath)) {
        result = ObjectUtils.merge(result, FsUtils.readJson(filePath));
      }
    }

    return result;
  }

  public async listenAsync(): Promise<void> {
    await new Promise<void>(async (resolve) => {
      this._logger.debug("서버 시작..." + process.env["SD_VERSION"]);

      if (this.options.ssl) {
        const pfx =
          typeof this.options.ssl.pfxBuffer === "function"
            ? await this.options.ssl.pfxBuffer()
            : this.options.ssl.pfxBuffer;
        this._httpServer = https.createServer({
          pfx,
          passphrase: this.options.ssl.passphrase,
        });
      }
      else {
        this._httpServer = http.createServer();
      }

      this._httpServer.on("request", async (req, res) => {
        await this._onWebRequestAsync(req, res);
      });

      this._wsServer = new WebSocketServer({ server: this._httpServer });
      this._wsServer.on("connection", async (wsClient, req) => {
        wsClient["isAlive"] = true;
        wsClient.on("pong", () => {
          wsClient["isAlive"] = true;
        });
        await this._onWsClientConnectionAsync(wsClient, req);
      });

      clearInterval(this._pingInterval);
      this._pingInterval = setInterval(() => {
        this._wsServer!.clients.forEach((wsClient) => {
          if (wsClient["isAlive"] === false) return wsClient.terminate();

          wsClient["isAlive"] = false;
          wsClient.ping();
        });
      }, 10000);

      this._httpServer.listen(this.options.port, () => {
        resolve();
      });
    });

    this.isOpen = true;
    this._logger.debug("서버 시작됨");
    this.emit("ready");
  }

  public async closeAsync(): Promise<void> {
    clearInterval(this._pingInterval);

    if (this._wsServer) {
      this._wsServer.clients.forEach((client) => {
        client.terminate();
      });

      await new Promise<void>((resolve, reject) => {
        this._wsServer!.close((err) => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        });
      });
    }

    await new Promise<void>((resolve, reject) => {
      if (!this._httpServer || !this._httpServer.listening) {
        resolve();
        return;
      }

      this._httpServer.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });

    this.isOpen = false;
    this._logger.debug("서버 종료됨");
    this.emit("close");
  }

  public broadcastReload(changedFileSet: Set<string>): void {
    this._logger.debug("서버내 모든 클라이언트 RELOAD 명령 전송");
    this._wsServer?.clients.forEach(async (wsClient) => {
      await this._sendAsync(wsClient, { name: "client-reload", changedFileSet });
    });
  }

  public async emitAsync<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ): Promise<void> {
    const listenerInfos: { key: string; info: T["info"] }[] = this._eventListeners
      .filter((item) => item.eventName === eventType.name)
      .map((item) => ({ key: item.key, info: item.info }));

    const targetKeys = listenerInfos.filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    const listeners = this._eventListeners.filter((item) => targetKeys.includes(item.key));
    for (const listener of listeners) {
      const wsClient = await this.getWsClientAsync(listener.socketId);
      if (wsClient?.readyState === WebSocket.OPEN) {
        const evtMsg: TSdServiceS2CMessage = {
          name: "event",
          key: listener.key,
          body: data,
        };
        wsClient.send(JsonConvert.stringify(evtMsg));
      }
    }
  }

  private async _getWsClientIdAsync(wsClient: WebSocket): Promise<string> {
    return await new Promise<string>(async (resolve) => {
      const msgFn = (msgJson: string): void => {
        const msg = JsonConvert.parse(msgJson) as TSdServiceC2SMessage;
        if (msg.name === "client-get-id-response") {
          wsClient.off("message", msgFn);
          resolve(msg.body);
        }
      };
      wsClient.on("message", msgFn);

      await this._sendAsync(wsClient, { name: "client-get-id" });
    });
  }

  private async _onWsClientConnectionAsync(
    wsClient: WebSocket,
    req: http.IncomingMessage,
  ): Promise<void> {
    const wsClientId = await this._getWsClientIdAsync(wsClient);

    this._wsServer?.clients.forEach((client) => {
      if (client["id"] === wsClientId) {
        this._logger.debug(
          "클라이언트 기존연결 끊기: " +
          wsClientId +
          ": " +
          client["connectedAtDateTime"].toFormatString("yyyy:MM:dd HH:mm:ss.fff"),
        );
        client.terminate();
      }
    });

    wsClient["id"] = wsClientId;
    wsClient["connectedAtDateTime"] = new DateTime();
    wsClient["remoteAddress"] = req.socket.remoteAddress;

    this._logger.debug(
      "클라이언트 연결됨: "
      + wsClientId
      + ": "
      + req.socket.remoteAddress
      + ": "
      + this._wsServer?.clients.size,
    );

    wsClient.on("close", (code) => {
      this._onWsClientClosed(wsClientId, code);
    });

    wsClient.on("message", async (msgJson: string) => {
      await this._onWsClientMessageAsync(wsClientId, msgJson);
    });

    await this._sendAsync(wsClient, { name: "connected" });
  }

  private _onWsClientClosed(wsClientId: string, code: number): void {
    this._logger.debug("클라이언트 연결 끊김: "
      + wsClientId
      + ": "
      + this._wsServer?.clients.size
      + ": "
      + code);
    // 1001: 클라이언트 창이 닫히거나 RELOAD 될때
    // 1006: 모바일앱을 강제 종료했을때
    if (code === 1001 || code === 1006) {
      this._logger.debug("닫힌 소켓의 이벤트 리스너 비우기...");
      const disconnectedListeners = this._eventListeners.filter((item) => item.socketId
        === wsClientId);
      for (const disconnectedListener of disconnectedListeners) {
        this._eventListeners.remove(disconnectedListener);
      }
    }
  }

  private async _onWsClientMessageAsync(socketId: string, msgJson: string): Promise<void> {
    const msg = JsonConvert.parse(msgJson) as TSdServiceC2SMessage;
    if (msg.name === "request") {
      await this._onSocketRequestAsync(socketId, msg);
    }
    else if (msg.name === "request-split") {
      await this._onSocketRequestSplitAsync(socketId, msg);
    }
  }

  private async _onSocketRequestAsync(socketId: string, req: ISdServiceRequest): Promise<void> {
    this._logger.debug("요청 받음", req);

    const res = await this._processSocketRequestAsync(socketId, req);

    this._logger.debug(`응답 전송 (size: ${Buffer.from(JsonConvert.stringify(res)).length})`);
    await this._sendAsync(socketId, res);
  }

  private async _onSocketRequestSplitAsync(
    socketId: string,
    splitReq: ISdServiceSplitRequest,
  ): Promise<void> {
    this._logger.debug("분할요청 받음", splitReq.uuid + "(" + splitReq.index + ")");

    const cacheInfo = this._splitReqCache.getOrCreate(
      splitReq.uuid,
      { completedSize: 0, data: [] },
    );
    cacheInfo.data[splitReq.index] = splitReq.body;
    cacheInfo.completedSize += splitReq.body.length;

    const isCompleted = cacheInfo.completedSize === splitReq.fullSize;

    await this._sendAsync(socketId, {
      name: "response-for-split",
      reqUuid: splitReq.uuid,
      completedSize: cacheInfo.completedSize,
    });

    if (isCompleted) {
      const req = JsonConvert.parse(cacheInfo.data.join("")) as ISdServiceRequest;
      await this._onSocketRequestAsync(socketId, req);
      this._splitReqCache.delete(splitReq.uuid);
    }
  }

  private async _sendAsync(wsClient: WebSocket, cmd: TSdServiceS2CMessage): Promise<void>;
  private async _sendAsync(socketId: string, cmd: TSdServiceS2CMessage): Promise<void>;
  private async _sendAsync(arg: WebSocket | string, cmd: TSdServiceS2CMessage): Promise<void> {
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

        try {
          const wsClient = arg instanceof WebSocket ? arg : await this.getWsClientAsync(arg);
          wsClient?.send(splitReqJson);
        }
        catch (err) {
          this._logger.error("소켓요청을 처리하는 중에 클라이언트 소켓이 끊김", err);
        }

        currSize += splitBody.length;
        index++;
      }
    }
    else {
      try {
        const wsClient = arg instanceof WebSocket ? arg : await this.getWsClientAsync(arg);
        wsClient?.send(cmdJson);
      }
      catch (err) {
        this._logger.error("소켓요청을 처리하는 중에 클라이언트 소켓이 끊김", err);
      }
    }
  }

  private async _runServiceMethodAsync(def: {
    socketId?: string;
    request?: ISdServiceRequest;
    serviceName: string;
    methodName: string;
    params: any[];
    webHeaders?: http.IncomingHttpHeaders;
  }): Promise<any> {
    // 서비스 가져오기
    const serviceClass = this.options.services.last((item) => item.name === def.serviceName);
    if (!serviceClass) {
      throw new Error(`서비스[${def.serviceName}]를 찾을 수 없습니다.`);
    }
    const service: SdServiceBase = new serviceClass();
    service.server = this;
    service.request = def.request;
    service.socketId = def.socketId;
    service.webHeaders = def.webHeaders;

    // 메소드 가져오기
    const method = service[def.methodName];
    if (method === undefined) {
      throw new Error(`메소드[${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
    }

    // 실행
    return await method.apply(service, def.params);
  }

  private async _processSocketRequestAsync(
    socketId: string,
    req: ISdServiceRequest,
  ): Promise<ISdServiceResponse> {
    try {
      const cmdSplit = req.command.split(".");
      if (cmdSplit.length === 2) {
        const serviceName = cmdSplit[0];
        const methodName = cmdSplit[1];

        const result = await this._runServiceMethodAsync({
          socketId,
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

        this._eventListeners.push({ key, eventName, info, socketId });

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: undefined,
        };
      }
      else if (req.command === "removeEventListener") {
        const key = req.params[0] as string;
        this._eventListeners.remove((item) => item.key === key);

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: undefined,
        };
      }
      else if (req.command === "getEventListenerInfos") {
        const eventName = req.params[0] as string;

        return {
          name: "response",
          reqUuid: req.uuid,
          state: "success",
          body: this._eventListeners
            .filter((item) => item.eventName === eventName)
            .map((item) => ({ key: item.key, info: item.info })),
        };
      }
      else if (req.command === "emitEvent") {
        const targetKeys = req.params[0] as string[];
        const data = req.params[1];

        const listeners = this._eventListeners.filter((item) => targetKeys.includes(item.key));
        for (const listener of listeners) {
          const wsClient = await this.getWsClientAsync(listener.socketId);
          if (wsClient?.readyState === WebSocket.OPEN) {
            const evtMsg: TSdServiceS2CMessage = {
              name: "event",
              key: listener.key,
              body: data,
            };
            wsClient.send(JsonConvert.stringify(evtMsg));
          }
        }

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

  private async _onWebRequestAsync(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    try {
      if (this.options.middlewares) {
        for (const optMdw of this.options.middlewares) {
          await new Promise<void>((resolve, reject) => {
            optMdw(req, res, (err) => {
              if (err != null) {
                reject(err);
                return;
              }

              resolve();
            });
          });
          if (res.writableEnded) return;
        }
      }

      const urlObj = url.parse(req.url!, true, false);
      const urlPath = decodeURI(urlObj.pathname!.slice(1));
      const urlPathChain = urlPath.split("/");

      if (urlPathChain[0] === "api") {
        if (req.headers.origin?.includes("://localhost") && req.method === "OPTIONS") {
          res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
          res.end();
          return;
        }

        const serviceName = urlPathChain[1];
        const methodName = urlPathChain[2];

        let params: any[] | undefined;
        if (req.method === "GET") {
          if (typeof urlObj.query["json"] !== "string") throw new Error();
          if (req.headers["content-type"]?.toLowerCase().includes("json")) {
            params = JsonConvert.parse(urlObj.query["json"]);
          }
          else {
            params = [urlObj.query];
          }
        }
        else if (req.method === "POST") {
          const body = await new Promise<Buffer>((resolve) => {
            let tmp = Buffer.from([]);
            req.on("data", (chunk) => {
              tmp = Buffer.concat([tmp, chunk]);
            });
            req.on("end", () => {
              resolve(tmp);
            });
          });

          if (req.headers["content-type"]?.toLowerCase().includes("json")) {
            params = JsonConvert.parse(body.toString());
          }
          else {
            params = [body.toString()];
          }
        }

        if (params) {
          const serviceResult = await this._runServiceMethodAsync({
            serviceName: serviceName,
            methodName,
            params,
            webHeaders: req.headers,
          });

          const result = req.headers["content-type"]?.toLowerCase().includes("json")
            ? JsonConvert.stringify(serviceResult)
            : serviceResult;

          res.writeHead(200, {
            "Content-Length": Buffer.from(result).length,
            "Content-Type": req.headers["content-type"]?.toLowerCase(),
          });
          res.end(result);

          return;
        }
      }

      if (req.method === "GET") {
        let targetFilePath: string;
        const currPathProxyFrom = Object.keys(this.pathProxy)
          .single((from) => urlPath.startsWith(from));
        if (currPathProxyFrom !== undefined) {
          if (typeof this.pathProxy[currPathProxyFrom] === "number") {
            const proxyReq = http.request(
              {
                port: this.pathProxy[currPathProxyFrom],
                path: req.url,
                method: req.method,
                headers: req.headers,
              },
              (proxyRes) => {
                if (proxyRes.statusCode === 404) {
                  res.writeHead(404, { "Content-Type": "text/html" });
                  res.end("<h1>A custom 404 page</h1>");
                  return;
                }

                res.writeHead(proxyRes.statusCode!, proxyRes.headers);
                proxyRes.pipe(res, { end: true });
              },
            );
            req.pipe(proxyReq, { end: true });
            return;
          }
          else {
            targetFilePath = path.resolve(
              this.pathProxy[currPathProxyFrom] + urlPath.substring(currPathProxyFrom.length),
            );
          }
        }
        else {
          targetFilePath = path.resolve(this.options.rootPath, "www", urlPath);
        }
        targetFilePath =
          FsUtils.exists(targetFilePath) && FsUtils.stat(targetFilePath).isDirectory()
            ? path.resolve(targetFilePath, "index.html")
            : targetFilePath;

        if (!FsUtils.exists(targetFilePath)) {
          const errorMessage = "파일을 찾을 수 없습니다.";
          this._responseErrorHtml(res, 404, errorMessage);
          this._logger.warn(`[404] ${errorMessage} (${targetFilePath})`);
          return;
        }

        if (path.basename(targetFilePath).startsWith(".")) {
          const errorMessage = "파일을 사용할 권한이 없습니다.";
          this._responseErrorHtml(res, 403, errorMessage);
          this._logger.warn(`[403] ${errorMessage} (${targetFilePath})`);
          return;
        }

        const fileStream = FsUtils.createReadStream(targetFilePath);
        const targetFileSize = (await FsUtils.lstatAsync(targetFilePath)).size;

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Length", targetFileSize);
        res.setHeader("Content-Type", mime.getType(targetFilePath)!);
        res.writeHead(200);
        fileStream.pipe(res);
      }
      else {
        const errorMessage = "요청이 잘못되었습니다.";
        this._responseErrorHtml(res, 405, errorMessage);
        this._logger.warn(`[405] ${errorMessage} (${req.method!.toUpperCase()})`);
        return;
      }
    }
    catch (err) {
      if (err instanceof SdWebRequestError) {
        res.writeHead(err.statusCode);
        res.end(err.message);
        this._logger.error(`[${err.statusCode}]\n${err.message}`, err);
      }
      else {
        const errorMessage = "요청 처리중 오류가 발생하였습니다.";
        this._responseErrorHtml(res, 405, errorMessage);
        this._logger.error(`[405] ${errorMessage}`, err);
      }
    }
  }

  private _responseErrorHtml(res: http.ServerResponse, code: number, message: string): void {
    res.writeHead(code);
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="UTF-8">
    <title>${code}: ${message}</title>
</head>
<body>${code}: ${message}</body>
</html>`);
  }
}

interface IEventListener {
  key: string;
  eventName: string;
  info: any;
  socketId: string;
}

type TSdWebSocket = WebSocket & {
  id: string;
  connectedAtDateTime: DateTime;
  remoteAddress?: string;
  isAlive?: boolean;
};
