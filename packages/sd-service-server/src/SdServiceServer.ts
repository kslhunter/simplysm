import https from "https";
import http from "http";
import * as socketIo from "socket.io";
import { NextHandleFunction } from "connect";
import url from "url";
import path from "path";
import mime from "mime";
import { FsUtil, Logger } from "@simplysm/sd-core-node";
import { ISdServiceRequest, ISdServiceResponse, ISdServiceSplitRequest } from "@simplysm/sd-service-common";
import { ISdServiceServerOptions, SdServiceBase } from "./commons";
import { EventEmitter } from "events";
import { JsonConvert } from "@simplysm/sd-core-common";

export class SdServiceServer extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-service", this.constructor.name]);

  private _httpServer?: http.Server | https.Server;
  private _socketServer?: socketIo.Server;
  public isOpen = false;

  private readonly _splitReqCache = new Map<string, { completedSize: number; data: string[] }>();

  private readonly _eventListeners: IEventListener[] = [];

  public devMiddlewares?: NextHandleFunction[];

  public constructor(public readonly options: ISdServiceServerOptions) {
    super();
  }

  public async listenAsync(): Promise<void> {
    await new Promise<void>(async (resolve) => {
      this._logger.debug("서버 시작...");

      if (this.options.ssl) {
        const pfx = typeof this.options.ssl.pfxBuffer === "function" ? await this.options.ssl.pfxBuffer() : this.options.ssl.pfxBuffer;
        this._httpServer = https.createServer({
          pfx,
          passphrase: this.options.ssl.passphrase
        });
      }
      else {
        this._httpServer = http.createServer();
      }

      this._httpServer.on("request", async (req, res) => {
        await this._onWebRequestAsync(req, res);
      });

      this._socketServer = new socketIo.Server(this._httpServer);
      this._socketServer.on("connection", (socket) => {
        this._onSocketConnection(socket);
      });

      this._httpServer.listen(this.options.port, () => {
        resolve();
      });
    });

    this.isOpen = true;
    this._logger.debug("서버 시작됨");
    this.emit("ready");
  }

  public async closeAsync(): Promise<void> {
    if (this._socketServer) {
      this._socketServer.close();
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

  private _onSocketConnection(socket: socketIo.Socket): void {
    this._logger.debug("클라이언트 연결됨");

    socket.on("disconnect", () => {
      this._logger.debug("닫힌 소켓의 이벤트 리스너 비우기...");
      const disconnectedListeners = this._eventListeners.filter((item) => item.socket.id === socket.id);
      for (const disconnectedListener of disconnectedListeners) {
        this._eventListeners.remove(disconnectedListener);
      }
    });

    socket.on("request", async (reqJson: string) => {
      const req = JsonConvert.parse(reqJson) as ISdServiceRequest;
      this._logger.debug("요청 받음", req);

      const res = await this._onSocketRequestAsync(socket, req);

      socket.emit(`response:${req.uuid}`, JsonConvert.stringify(res));
    });

    socket.on("request-split", async (splitReqJson: string) => {
      const splitReq = JsonConvert.parse(splitReqJson) as ISdServiceSplitRequest;
      this._logger.debug("분할요청 받음", splitReq.uuid + "(" + splitReq.index + ")");

      const cacheInfo = this._splitReqCache.getOrCreate(splitReq.uuid, { completedSize: 0, data: [] });
      cacheInfo.data[splitReq.index] = splitReq.body;
      cacheInfo.completedSize += splitReq.body.length;
      if (cacheInfo.completedSize === splitReq.fullSize) {
        const req = JsonConvert.parse(cacheInfo.data.join("")) as ISdServiceRequest;
        this._logger.debug("요청 받음", req);

        const res = await this._onSocketRequestAsync(socket, req);

        socket.emit(`response:${req.uuid}`, JsonConvert.stringify(res));
      }
    });
  }

  private async _onSocketRequestAsync(socket: socketIo.Socket, req: ISdServiceRequest): Promise<ISdServiceResponse> {
    try {
      const cmdSplit = req.command.split(".");
      if (cmdSplit.length === 2) {
        const serviceName = cmdSplit[0];
        const methodName = cmdSplit[1];

        // 서비스 가져오기
        const serviceClass = this.options.services.single((item) => item.name === serviceName);
        if (!serviceClass) {
          throw new Error(`서비스[${serviceName}]를 찾을 수 없습니다.`);
        }
        const service: SdServiceBase = new serviceClass();
        service.server = this;
        service.request = req;
        service.socket = socket;

        // 메소드 가져오기
        const method = service[methodName];
        if (method === undefined) {
          throw new Error(`메소드[${serviceName}.${methodName}]를 찾을 수 없습니다.`);
        }

        // 실행
        const result = await method.apply(service, req.params);

        // 응답
        return {
          type: "response",
          body: result
        };
      }
      else if (req.command === "addEventListener") {
        const key = req.params[0] as string;
        const eventName = req.params[1] as string;
        const info = req.params[2];

        this._eventListeners.push({ key, eventName, info, socket });

        return {
          type: "response",
          body: undefined
        };
      }
      else if (req.command === "removeEventListener") {
        const key = req.params[0] as string;
        this._eventListeners.remove((item) => item.key === key);

        return {
          type: "response",
          body: undefined
        };
      }
      else if (req.command === "getEventListenerInfos") {
        const eventName = req.params[0] as string;

        return {
          type: "response",
          body: this._eventListeners
            .filter((item) => item.eventName === eventName)
            .map((item) => ({ key: item.key, info: item.info }))
        };
      }
      else if (req.command === "emitEvent") {
        const targetKeys = req.params[0] as string[];
        const data = req.params[1];

        const listeners = this._eventListeners.filter((item) => targetKeys.includes(item.key));
        for (const listener of listeners) {
          if (listener.socket.connected) {
            listener.socket.emit(`event:${listener.key}`, JsonConvert.stringify(data));
          }
        }

        return {
          type: "response",
          body: undefined
        };
      }
      else {
        // 에러 응답
        return {
          type: "error",
          body: "요청이 잘못되었습니다."
        };
      }
    }
    catch (err) {
      // 에러 응답
      return {
        type: "error",
        body: err.stack
      };
    }
  }

  private async _onWebRequestAsync(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      if (this.devMiddlewares) {
        for (const devMdw of this.devMiddlewares) {
          await new Promise<void>((resolve, reject) => {
            devMdw(req, res, (err) => {
              if (err != null) {
                reject(err);
                return;
              }

              resolve();
            });
          });
        }
      }

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
        }
      }

      if (req.method !== "GET") {
        const errorMessage = "요청이 잘못되었습니다.";
        this._responseErrorHtml(res, 405, errorMessage);
        this._logger.warn(`[405] ${errorMessage} (${req.method!.toUpperCase()})`);
        return;
      }

      const urlObj = url.parse(req.url!, true, false);
      const urlPath = decodeURI(urlObj.pathname!.slice(1));
      let targetFilePath = path.resolve(this.options.rootPath, "www", urlPath);
      targetFilePath = FsUtil.exists(targetFilePath) && FsUtil.stat(targetFilePath).isDirectory() ? path.resolve(targetFilePath, "index.html") : targetFilePath;

      if (!FsUtil.exists(targetFilePath)) {
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

      const fileStream = FsUtil.createReadStream(targetFilePath);
      const targetFileSize = (await FsUtil.lstatAsync(targetFilePath)).size;

      res.setHeader("Content-Length", targetFileSize);
      res.setHeader("Content-Type", mime.getType(targetFilePath)!);
      res.writeHead(200);
      fileStream.pipe(res);
    }
    catch (err) {
      const errorMessage = "요청 처리중 오류가 발생하였습니다.";
      this._responseErrorHtml(res, 405, errorMessage);
      this._logger.error(`[405] ${errorMessage}`, err);
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
  socket: socketIo.Socket;
}

