import * as mime from "mime";
import * as fs from "fs-extra";
import * as path from "path";
import * as url from "url";
import * as http from "http";
import * as WebSocket from "ws";
import {EventEmitter} from "events";
import {JsonConvert, Logger, optional, Type} from "@simplysm/sd-core";
import {SdServiceServerConnection} from "./SdServiceServerConnection";
import {SdServiceBase} from "./SdServiceBase";
import * as net from "net";
import {ISdServiceRequest, ISdServiceResponse} from "../commons";
import {NextHandleFunction} from "./commons";
import * as https from "https";
import {SdServiceServerUtil} from "./SdServiceServerUtil";

export class SdServiceServer extends EventEmitter {
  private readonly _logger = new Logger("@simplysm/sd-service", "SdServiceServer");

  private _httpServer?: http.Server | https.Server;
  private _wsServer?: WebSocket.Server;
  private _wsConnections: SdServiceServerConnection[] = [];
  private _httpConnections: net.Socket[] = [];
  private _eventListeners: ISdServiceServerEventListener[] = [];
  private readonly _middlewares: NextHandleFunction[] = [];

  public get isListening(): boolean {
    return !!this._httpServer && this._httpServer.listening;
  }

  public constructor(public port: number,
                     public services: Type<SdServiceBase>[],
                     public rootPath: string,
                     private readonly _ssl?: { pfx: string; passphrase: string }) {
    super();
    // console.log(1);
  }

  public async listenAsync(): Promise<void> {
    if (this.isListening) {
      await this.closeAsync();
    }

    await new Promise<void>(async (resolve, reject) => {
      this._httpServer = this._ssl
        ? https.createServer({
          pfx: await fs.readFile(this._ssl.pfx),
          passphrase: this._ssl.passphrase
        })
        : http.createServer();

      this._wsServer = new WebSocket.Server({
        server: this._httpServer
      });
      this._wsConnections = [];
      this._eventListeners = [];

      this._wsServer.on("connection", async (conn, connReq) => {
        try {
          await this._onSocketConnectionAsync(conn, connReq);
        }
        catch (err) {
          this._logger.error(`클라이언트와 연결할 수 없습니다.`, err);
          throw err;
        }
      });

      this._httpServer.on("request", (req, res) => {
        this._onWebRequest(req, res);
      });

      this._httpServer.listen(this.port, () => {
        this.emit("ready");

        this._httpServer!.on("connection", conn => {
          this._httpConnections.push(conn);

          conn.on("close", () => {
            this._httpConnections.remove(conn);
          });
        });

        this._httpServer!.on("close", () => {
          this.emit("close");
          // delete this.expressServer;
          delete this._httpServer;
          delete this._wsServer;
          this._wsConnections = [];
          this._httpConnections = [];
          this._eventListeners = [];
        });

        resolve();
      });
    });

    process.once("exit", async () => {
      await this.closeAsync();
    });
  }

  public async closeAsync(): Promise<void> {
    await Promise.all([
      ...this._wsConnections.map(async wsConnection => {
        await wsConnection.closeAsync();
      }),
      ...this._httpConnections.map(httpConnection => {
        httpConnection.end();
      }),
      new Promise<void>((resolve, reject) => {
        if (this._wsServer) {
          this._wsServer.close(err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        }
        else {
          resolve();
        }
      }),
      new Promise<void>((resolve, reject) => {
        if (this._httpServer) {
          this._httpServer.close(err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        }
        else {
          resolve();
        }
      })
    ]);
  }

  public async emitAsync(id: number, data: any): Promise<void> {
    const eventListener = this._eventListeners.single(item => item.id === id);
    if (!eventListener) return;

    await eventListener.conn.sendAsync({
      eventListenerId: eventListener.id,
      data
    });
  }

  public addMiddleware(middleware: NextHandleFunction): void {
    this._middlewares.push(middleware);
  }

  private _onWebRequest(request: http.IncomingMessage, response: http.ServerResponse): void {
    const runners = this._middlewares.concat([
      async (req, res, next) => {
        try {
          if (req.method !== "GET") {
            const errorMessage = `요청이 잘못되었습니다.`;
            this._responseErrorHtml(res, 405, errorMessage);
            next(new Error(`${errorMessage} (${req.method!.toUpperCase()})`));
          }

          const urlObj = url.parse(req.url!, true, false);
          const urlPath = decodeURI(urlObj.pathname!.slice(1));
          const localPath = path.resolve(this.rootPath, "www", urlPath);

          if (!await fs.pathExists(localPath)) {
            const errorMessage = `파일을 찾을 수 없습니다.`;
            this._responseErrorHtml(res, 404, errorMessage);
            next(new Error(`${errorMessage} (${localPath})`));
            return;
          }

          if (path.basename(localPath).startsWith(".")) {
            const errorMessage = `파일을 사용할 권한이 없습니다.`;
            this._responseErrorHtml(res, 403, errorMessage);
            next(new Error(`${errorMessage} (${localPath})`));
            return;
          }

          let filePath: string;

          // 'url'이 디렉토리일 경우, index.html 파일 사용
          if ((await fs.lstat(localPath)).isDirectory()) {
            filePath = path.resolve(localPath, "index.html");
          }
          else {
            filePath = localPath;
          }

          if (!await fs.pathExists(filePath)) {
            const errorMessage = `파일을 찾을 수 없습니다.`;
            this._responseErrorHtml(res, 404, errorMessage);
            next(new Error(`${errorMessage} (${filePath})`));
            return;
          }

          const fileStream = fs.createReadStream(filePath);
          const indexFileSize = (await fs.lstat(filePath)).size;

          res.setHeader("Content-Length", indexFileSize);
          res.setHeader("Content-Type", mime.getType(filePath)!);
          res.writeHead(200);
          fileStream.pipe(res);
        }
        catch (err) {
          const errorMessage = `요청이 잘못되었습니다.`;
          this._responseErrorHtml(res, 405, errorMessage);
          next(new Error(errorMessage));
        }
      }
    ]);

    const runMiddleware = (index: number) => {
      if (!runners[index]) return;
      runners[index](request, response, err => {
        if (err) {
          this._logger.error(err);
          return;
        }

        runMiddleware(index + 1);
      });
    };

    runMiddleware(0);
  }

  private async _onSocketConnectionAsync(conn: WebSocket, connReq: http.IncomingMessage): Promise<void> {
    const origins = await optional(async () => (await SdServiceServerUtil.getConfigAsync(this.rootPath))["service"]["origins"]);
    if (origins && !origins.includes(connReq.headers.origin)) {
      throw new Error(`등록되지 않은 'URL'에서 클라이언트의 연결 요청을 받았습니다: ${connReq.headers.origin}`);
    }

    this._logger.log(`클라이언트의 연결 요청을 받았습니다 : ${connReq.headers.origin}`);

    const wsConnection = new SdServiceServerConnection(conn, connReq);
    this._wsConnections.push(wsConnection);

    wsConnection.on("request", async req => {
      this._logger.log(`요청을 받았습니다 : ${connReq.headers.origin} - ${JsonConvert.stringify(req, {hideBuffer: true})}`);
      let res: ISdServiceResponse;
      try {
        res = await this._onSocketRequestAsync(wsConnection, req);
      }
      catch (err) {
        this._logger.error(`에러가 발생했습니다 : ${connReq.headers.origin}`, err);
        res = {
          requestId: req.id,
          type: "error",
          body: err.message
        };
      }
      this._logger.log(`결과를 반환합니다. : ${connReq.headers.origin} - ${JsonConvert.stringify(res, {hideBuffer: true})}`);
      await wsConnection.sendAsync(res);
    });

    wsConnection.on("close", () => {
      this._eventListeners.remove(item => item.conn === wsConnection);
      this._wsConnections.remove(wsConnection);
    });
  }

  public getEventListeners(eventName: string): { id: number; info: object }[] {
    return this._eventListeners.filter(item => item.eventName === eventName).map(item => ({
      id: item.id,
      info: item.info
    }));
  }

  private async _onSocketRequestAsync(conn: SdServiceServerConnection, req: ISdServiceRequest): Promise<ISdServiceResponse> {
    if (req.command === "addEventListener") {
      const eventListenerId = (this._eventListeners.max(item => item.id) || 0) + 1;

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
        body: this._eventListeners.filter(item => item.eventName === eventName).map(item => ({
          id: item.id,
          info: item.info
        }))
      };
    }
    else if (req.command === "emitEvent") {
      const ids: number[] = req.params[0];
      const data = req.params[1];

      for (const id of ids) {
        await this.emitAsync(id, data);
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
      const serviceClass = this.services
      /*.concat([
        SdSmtpClientService,
        SdCryptoService,
        SdOrmService
      ])*/
        .single(item => item.name === serviceName);
      if (!serviceClass) {
        throw new Error(`서비스[${serviceName}]를 찾을 수 없습니다.`);
      }
      const service = new serviceClass(this, conn, req, this.rootPath);

      // 메소드 가져오기
      const method = service[methodName];
      if (!method) {
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

export interface ISdServiceServerEventListener {
  id: number;
  eventName: string;
  info: object;
  conn: SdServiceServerConnection;
}
