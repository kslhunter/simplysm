import { EventEmitter } from "events";
import * as https from "https";
import * as http from "http";
import * as WebSocket from "ws";
import { FsUtil, Logger, SdProcessManager } from "@simplysm/sd-core-node";
import { JsonConvert, Type } from "@simplysm/sd-core-common";
import { SdServiceServerConnection } from "./SdServiceServerConnection";
import { SdServiceBase } from "./SdServiceBase";
import { NextHandleFunction } from "connect";
import * as querystring from "querystring";
import * as url from "url";
import * as path from "path";
import * as mime from "mime";
import { ISdServiceErrorResponse, ISdServiceRequest, ISdServiceResponse } from "@simplysm/sd-service-common";
import * as net from "net";
import { SdCryptoService } from "./services/SdCryptoService";
import { SdOrmService } from "./services/SdOrmService";
import { SdSmtpClientService } from "./services/SdSmtpClientService";
import { SdServiceServerConfigUtil } from "./SdServiceServerConfigUtil";

export class SdServiceServer extends EventEmitter {
  private _wsServer?: WebSocket.Server;
  private _httpServer?: http.Server | https.Server;
  private readonly _logger: Logger;
  public middlewares: NextHandleFunction[];
  public wsMiddlewares: ((req: ISdServiceRequest) => ISdServiceResponse | void)[];
  public readonly rootPath: string;

  private readonly _httpConnections: net.Socket[] = [];
  private readonly _wsConnections: WebSocket[] = [];

  private readonly _eventListeners: ISdServiceServerEventListener[] = [];

  public get isListening(): boolean {
    return this._httpServer?.listening === true || this._wsServer !== undefined;
  }

  public constructor(public readonly options: ISdServiceServerOptions) {
    super();
    this._logger = Logger.get(["simplysm", "sd-service-server"]);
    this.middlewares = this.options.middlewares ?? [];
    this.wsMiddlewares = [];
    this.rootPath = this.options.rootPath;
  }

  public async listenAsync(): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      if (this.isListening) {
        await this.closeAsync();
      }

      this._httpServer = this.options.ssl ?
        https.createServer({
          pfx: await FsUtil.readFileBufferAsync(this.options.ssl.pfx),
          passphrase: this.options.ssl.passphrase
        }) :
        http.createServer();

      this._wsServer = new WebSocket.Server({
        server: this._httpServer
      });

      this._wsServer.on("connection", (conn, connReq) => {
        this._wsConnections.push(conn);

        conn.on("close", () => {
          this._wsConnections.remove(conn);
        });

        try {
          this._onSocketConnection(conn, connReq);
        }
        catch (err) {
          this._logger.error(`클라이언트와 연결할 수 없습니다.`, err);
        }
      });

      this._httpServer.on("request", (req, res) => {
        this._onWebRequest(req, res);
      });

      let isResolved = false;
      this._wsServer.on("error", (err) => {
        if (isResolved) {
          this._logger.error(`웹소켓 서버에서 오류가 발생했습니다.`, err);
        }
        else {
          reject(err);
        }
      });

      this._httpServer.on("error", (err) => {
        if (isResolved) {
          this._logger.error(`HTTP 서버에서 오류가 발생했습니다.`, err);
        }
        else {
          reject(err);
        }
      });

      this._httpServer.on("connection", (conn) => {
        this._httpConnections.push(conn);

        conn.on("close", () => {
          this._httpConnections.remove(conn);
        });
      });

      this._httpServer.listen(this.options.port, () => {
        this.emit("ready");
        resolve();
        isResolved = true;
      });
    });

    this._logger.log(`서버가 시작되었습니다.(${this.options.port !== undefined ? `PORT: ${this.options.port}` : ""})`);
  }

  public async closeAsync(): Promise<void> {
    this._eventListeners.clear();

    if (this._wsConnections.length > 0) {
      for (const wsConnection of this._wsConnections) {
        wsConnection.close();
      }
    }

    if (this._wsServer) {
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

    if (this._httpConnections.length > 0) {
      await this._httpConnections.parallelAsync(async (httpConnection) => {
        await new Promise<void>((resolve) => {
          httpConnection.end(() => {
            resolve();
          });
        });
      });
    }

    if (this._httpServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        this._httpServer!.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }

    this._logger.log(`서버가 종료되었습니다.`);
    this.emit("close");
  }

  private _onSocketConnection(conn: WebSocket, connReq: http.IncomingMessage): void {
    const origin: string | string[] = connReq.headers.origin ?? "unknown";

    this._logger.log(`클라이언트의 연결 요청을 받았습니다 : ${origin.toString()}`);

    const wsConn = new SdServiceServerConnection(conn, this.rootPath);
    wsConn.on("request", async (req: ISdServiceRequest) => {
      const serviceConfig = (await SdServiceServerConfigUtil.getConfigAsync(this.rootPath))?.["service"];
      const availableOrigins = serviceConfig?.origins as string[] | undefined;
      const availablePassword = serviceConfig?.password as string | undefined;

      let orgError = false;
      if (availableOrigins !== undefined) {
        if (connReq.headers.origin === undefined || !availableOrigins.includes(connReq.headers.origin)) {
          orgError = true;
          // throw new Error(`등록되지 않은 'URL'에서 클라이언트의 요청을 받았습니다: ${connReq.headers.origin}`);
        }
      }

      let pwdError = false;
      if (availablePassword !== undefined) {
        if (req.password !== availablePassword) {
          pwdError = true;
          // errors.push(`인증되지 않은 클라이언트에서 요청을 받았습니다: ${connReq.headers.origin}`);
        }
      }

      if (
        (orgError && pwdError) ||
        (availablePassword === undefined && orgError) ||
        (availableOrigins === undefined && pwdError)
      ) {
        throw new Error(`인증되지 않은 클라이언트에서 요청을 받았습니다: ${connReq.headers.origin ?? ""}`);
      }


      this._logger.debug(`요청을 받았습니다: ${origin.toString()} (${JsonConvert.stringify(req, { hideBuffer: true })})`);

      try {
        const res = await this._onSocketRequestAsync(wsConn, req);
        this._logger.debug(`결과를 반환합니다: ${origin.toString()} (${JsonConvert.stringify(res, { hideBuffer: true })})}`);
        await wsConn.sendAsync(res);
      }
      catch (err) {
        this._logger.error(`요청 처리중 에러가 발생했습니다: ${origin.toString()} (${JsonConvert.stringify(req, { hideBuffer: true })})`, err);
        const res: ISdServiceErrorResponse = {
          type: "error",
          requestId: req.id,
          message: err.message,
          stack: err.stack
        };
        await wsConn.sendAsync(res);
      }
    });

    wsConn.on("error", (err) => {
      this._logger.error(`요청 처리중 에러가 발생했습니다: ${origin.toString()}`, err);
    });
  }

  private _onWebRequest(webReq: http.IncomingMessage, webRes: http.ServerResponse): void {
    const runners = this.middlewares.concat([
      async (req, res, next): Promise<void> => {
        if (req.method !== "GET") {
          await new Promise<void>((resolve) => {
            let body = "";
            req.on("readable", () => {
              body += req.read();
            });
            req.on("end", () => {
              const errorMessage = `요청이 잘못되었습니다.`;
              this._responseErrorHtml(res, 405, errorMessage + "\n" + JsonConvert.stringify(querystring.parse(body), { space: 2 }));
              next(new Error(`${errorMessage} (${req.method!.toUpperCase()})`));
              resolve();
            });
          });
          return;
        }

        try {
          const urlObj = url.parse(req.url!, true, false);
          const urlPath = decodeURI(urlObj.pathname!.slice(1));
          const localPath = path.resolve(this.rootPath, "www", urlPath);

          if (!FsUtil.exists(localPath)) {
            const errorMessage = `파일을 찾을 수 없습니다.`;
            this._responseErrorHtml(res, 404, errorMessage);
            /*if (path.basename(localPath) !== "favicon.ico") {
              next(new Error(`[404] ${errorMessage} (${localPath})`));
            }
            else {
              this._logger.warn(`[404] ${errorMessage} (${localPath})`);
            }*/
            this._logger.warn(`[404] ${errorMessage} (${localPath})`);
            return;
          }

          if (path.basename(localPath).startsWith(".")) {
            const errorMessage = `파일을 사용할 권한이 없습니다.`;
            this._responseErrorHtml(res, 403, errorMessage);
            next(new Error(`[403] ${errorMessage} (${localPath})`));
            return;
          }

          let filePath: string;

          // 'url'이 디렉토리일 경우, index.html 파일 사용
          if ((await FsUtil.lstatAsync(localPath)).isDirectory()) {
            filePath = path.resolve(localPath, "index.html");
          }
          else {
            filePath = localPath;
          }

          if (!FsUtil.exists(filePath)) {
            const errorMessage = `파일을 찾을 수 없습니다.`;
            this._responseErrorHtml(res, 404, errorMessage);
            next(new Error(`[404] ${errorMessage} (${filePath})`));
            return;
          }

          const fileStream = FsUtil.createReadStream(filePath);
          const indexFileSize = (await FsUtil.lstatAsync(filePath)).size;

          res.setHeader("Content-Length", indexFileSize);
          res.setHeader("Content-Type", mime.getType(filePath)!);
          res.writeHead(200);
          fileStream.pipe(res);
        }
        catch (err) {
          const errorMessage = `요청이 잘못되었습니다.`;
          this._responseErrorHtml(res, 405, errorMessage);
          next(err);
        }
      }
    ]);

    const runMiddleware = (index: number): void => {
      if (typeof runners[index] === "undefined") return;

      runners[index](webReq, webRes, (err) => {
        if (err !== undefined) {
          this._logger.error(err);
          return;
        }

        runMiddleware(index + 1);
      });
    };

    runMiddleware(0);
  }

  private async _onSocketRequestAsync(conn: SdServiceServerConnection, req: ISdServiceRequest): Promise<ISdServiceResponse> {
    for (const wsMiddleware of this.wsMiddlewares) {
      const res = wsMiddleware(req);
      if (res) return res;
    }

    if (req.command === "md5") {
      const rawFilePath = req.params[0] as string;
      const filePath = rawFilePath.startsWith("/") ?
        path.resolve(this.rootPath, rawFilePath.slice(1).replace(/\\/g, "/")) :
        path.resolve(this.rootPath, rawFilePath.replace(/\\/g, "/"));

      const md5 = FsUtil.exists(filePath) ? await FsUtil.getMd5Async(filePath) : undefined;

      return {
        type: "response",
        requestId: req.id,
        body: md5
      };
    }
    else if (req.command === "upload") {
      return {
        type: "response",
        requestId: req.id
      };
    }
    else if (req.command === "exec") {
      const cmd = req.params[0];
      await SdProcessManager.spawnAsync(cmd);

      return {
        type: "response",
        requestId: req.id
      };
    }
    else if (req.command === "addEventListener") {
      const eventListenerId = (this._eventListeners.max((item) => item.id) ?? 0) + 1;

      this._eventListeners.push({
        id: eventListenerId,
        eventName: req.params[0],
        info: req.params[1],
        conn
      });

      return {
        requestId: req.id,
        type: "response",
        body: eventListenerId
      };
    }
    else if (req.command === "getEventListeners") {
      const eventName = req.params[0];

      return {
        requestId: req.id,
        type: "response",
        body: this._eventListeners
          .filter((item) => item.eventName === eventName)
          .map((item) => ({
            id: item.id,
            info: item.info
          }))
      };
    }
    else if (req.command === "removeEventListener") {
      const eventListenerId = req.params[0];
      this._eventListeners.remove((item) => item.id === eventListenerId);

      return {
        requestId: req.id,
        type: "response"
      };
    }
    else if (req.command === "emitEvent") {
      const ids: number[] = req.params[0];
      const data = req.params[1];

      for (const id of ids) {
        const eventListener = this._eventListeners.single((item) => item.id === id);
        if (eventListener) {
          await eventListener.conn.sendAsync({
            type: "event",
            eventListenerId: eventListener.id,
            body: data
          });
        }
      }

      return {
        requestId: req.id,
        type: "response"
      };
    }
    else {
      // COMMAND 분할
      const cmdSplit = req.command.split(".");
      const serviceName = cmdSplit[0];
      const methodName = cmdSplit[1];

      // 서비스 가져오기
      const serviceClass = this.options.services.concat([
        SdCryptoService,
        SdOrmService,
        SdSmtpClientService
      ]).single((item) => item.name === serviceName);
      if (!serviceClass) {
        throw new Error(`서비스[${serviceName}]를 찾을 수 없습니다.`);
      }
      const service = new serviceClass();
      service.server = this;
      service.request = req;
      service.conn = conn;

      // 메소드 가져오기
      const method = service[methodName];
      if (method === undefined) {
        throw new Error(`메소드[${serviceName}.${methodName}]를 찾을 수 없습니다.`);
      }

      // 실행
      const result = await method.apply(service, req.params);

      // 반환
      return {
        requestId: req.id,
        type: "response",
        body: result
      };
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

interface ISdServiceServerOptions {
  port?: number;
  ssl?: { pfx: string; passphrase: string };
  rootPath: string;
  services: Type<SdServiceBase>[];
  middlewares?: NextHandleFunction[];
}

interface ISdServiceServerEventListener {
  id: number;
  eventName: string;
  info: object;
  conn: SdServiceServerConnection;
}
