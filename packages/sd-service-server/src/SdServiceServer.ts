import {EventEmitter} from "events";
import * as https from "https";
import * as http from "http";
import * as fs from "fs-extra";
import * as WebSocket from "ws";
import {FsUtil, Logger, ProcessManager} from "@simplysm/sd-core-node";
import {NotImplementError, Type} from "@simplysm/sd-core-common";
import {SdServiceServerConnection} from "./SdServiceServerConnection";
import {ISdServiceErrorResponse, ISdServiceRequest, ISdServiceResponse} from "./common";
import {SdServiceBase} from "./SdServiceBase";

export class SdServiceServer extends EventEmitter {
  private readonly _logger: Logger;

  public constructor(private readonly _options?: ISdServiceServerOptions) {
    super();
    this._logger = Logger.get(["simplysm", "sd-service-server"]);
  }

  public async listenAsync(): Promise<void> {
    const httpServer = this._options?.ssl
      ? https.createServer({
        pfx: await fs.readFile(this._options.ssl.pfx),
        passphrase: this._options.ssl.passphrase
      })
      : http.createServer();

    const wsServer = new WebSocket.Server({
      server: httpServer
    });

    wsServer.on("connection", async (conn, connReq) => {
      try {
        await this._onSocketConnectionAsync(conn, connReq);
      }
      catch (err) {
        this._logger.error(`클라이언트와 연결할 수 없습니다.`, err);
      }
    });

    httpServer.on("request", (req, res) => {
      this._onWebRequest(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      let isResolved = false;
      wsServer.on("error", (err) => {
        if (isResolved) {
          this._logger.error(`웹소켓 서버에서 오류가 발생했습니다.`, err);
        }
        else {
          reject(err);
        }
      });

      httpServer.on("error", (err) => {
        if (isResolved) {
          this._logger.error(`HTTP 서버에서 오류가 발생했습니다.`, err);
        }
        else {
          reject(err);
        }
      });

      httpServer.listen(this._options?.port, () => {
        this.emit("ready");
        resolve();
        isResolved = true;
      });
    });
  }

  private async _onSocketConnectionAsync(conn: WebSocket, connReq: http.IncomingMessage): Promise<void> {
    /*const rootPath = this._options?.rootPath ?? process.cwd();
    const config = await this._getConfigAsync(rootPath);
    const availableOrigins = config.origins;
    if (!availableOrigins?.includes(connReq.headers.origin)) {
      throw new Error(`등록되지 않은 'URL'에서 클라이언트의 연결 요청을 받았습니다: ${connReq.headers.origin}`);
    }*/

    this._logger.log(`클라이언트의 연결 요청을 받았습니다 : ${connReq.headers.origin}`);

    const wsConn = new SdServiceServerConnection(conn);
    wsConn.on("request", async (req: ISdServiceRequest) => {
      this._logger.log(`요청을 받았습니다: ${connReq.headers.origin} (${req.id}, ${req.command})`);

      try {
        const res = await this._onSocketRequestAsync(wsConn, req);
        this._logger.log(`결과를 반환합니다: ${connReq.headers.origin} (${req.id}, ${req.command}, ${res.type})}`);
      }
      catch (err) {
        this._logger.error(`요청 처리중 에러가 발생했습니다: ${connReq.headers.origin} (${req.id}, ${req.command})`, err);
        const res: ISdServiceErrorResponse = {
          type: "error",
          requestId: req.id,
          message: err.message,
          stack: err.stack
        };
        await wsConn.sendAsync(res);
      }
    });

    wsConn.on("error", async (err) => {
      this._logger.error(`요청 처리중 에러가 발생했습니다: ${connReq.headers.origin}`, err);
    });
  }

  private _onWebRequest(req: any, res: any): void {
    // TODO
    throw new NotImplementError();
  }

  private async _onSocketRequestAsync(wsConn: SdServiceServerConnection, req: ISdServiceRequest): Promise<ISdServiceResponse> {
    if (req.command === "md5") {
      const filePath = req[0];

      const md5 = (await fs.pathExists(filePath))
        ? await FsUtil.getMd5Async(filePath)
        : undefined;

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
      await ProcessManager.spawnAsync(cmd);

      return {
        type: "response",
        requestId: req.id
      };
    }
    else if (req.command === "addEventListener") {
      // TODO
      throw new NotImplementError();
    }
    else if (req.command === "getEventListeners") {
      // TODO
      throw new NotImplementError();
    }
    else if (req.command === "emitEvent") {
      // TODO
      throw new NotImplementError();
    }
    else {
      // COMMAND 분할
      const cmdSplit = req.command.split(".");
      const serviceName = cmdSplit[0];
      const methodName = cmdSplit[1];

      // 서비스 가져오기
      const serviceClass = this._options?.services?.single((item) => item.name === serviceName);
      if (!serviceClass) {
        throw new Error(`서비스[${serviceName}]를 찾을 수 없습니다.`);
      }
      const service = new serviceClass();

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

  /*private async _getConfigAsync(rootPath: string, clientPath?: string): Promise<{ [key: string]: any }> {
    const targetPath = clientPath ? path.resolve(rootPath, "www", clientPath) : rootPath;

    const filePath = path.resolve(targetPath, ".config.json");
    if (!(await fs.pathExists(filePath))) {
      throw new Error(`서버에서 설정파일을 찾는데 실패하였습니다.\n\t- ${filePath}`);
    }

    return await fs.readJson(filePath);
  }*/
}

interface ISdServiceServerOptions {
  port?: number;
  ssl?: { pfx: string; passphrase: string };
  rootPath?: string;
  services?: Type<SdServiceBase>[];
}
