import * as https from "https";
import * as http from "http";
import * as socketIo from "socket.io";
import { ISdServiceServerOptions } from "./commons";
import { ISdServiceRequest } from "../commons";
import { FsUtil, Logger } from "@simplysm/sd-core-node";
import { NextHandleFunction } from "connect";
import url from "url";
import path from "path";
import mime from "mime";

export class SdServiceServer {
  private readonly _logger = Logger.get(["simplysm", "sd-service", this.constructor.name]);

  private _httpServer?: http.Server | https.Server;
  private _socketServer?: socketIo.Server;
  public isOpen = false;

  public devMiddlewares?: NextHandleFunction[];

  public constructor(public readonly options: ISdServiceServerOptions) {
  }

  public async listenAsync(): Promise<void> {
    await new Promise<void>((resolve) => {
      this._logger.debug("서버 시작...");

      this._httpServer = this.options.ssl
        ? https.createServer({
          pfx: this.options.ssl.pfxBuffer,
          passphrase: this.options.ssl.passphrase
        })
        : http.createServer();

      this._httpServer.on("request", async (req, res) => {
        await this._onWebRequestAsync(req, res);
      });

      this._socketServer = new socketIo.Server(this._httpServer);
      this._socketServer.on("connection", (socket) => {
        this._onSocketConnection(socket);
      });

      this._httpServer.listen(this.options.port, () => {
        resolve();
        this._logger.debug("서버 시작됨");
      });
    });

    this.isOpen = true;
  }

  public async closeAsync(): Promise<void> {
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
  }

  private _onSocketConnection(socket: socketIo.Socket): void {
    this._logger.debug("클라이언트 연결됨");

    socket.on("request", async (req: ISdServiceRequest) => {
      this._logger.debug("요청 받음", req);

      try {
        // 서비스 가져오기
        const serviceClass = this.options.services.single((item) => item.name === req.serviceName);
        if (!serviceClass) {
          throw new Error(`서비스[${req.serviceName}]를 찾을 수 없습니다.`);
        }
        const service = new serviceClass();

        // 메소드 가져오기
        const method = service[req.methodName];
        if (method === undefined) {
          throw new Error(`메소드[${req.serviceName}.${req.methodName}]를 찾을 수 없습니다.`);
        }

        // 실행
        const result = await method.apply(service, req.params);

        // 응답
        const res = {
          type: "response",
          body: result
        };
        socket.emit(`response:${req.uuid}`, res);
      }
      catch (err) {
        // 에러 응답
        const res = {
          type: "error",
          body: err.message
        };
        socket.emit(`response:${req.uuid}`, res);
      }
    });
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
      targetFilePath = FsUtil.exists(targetFilePath) && FsUtil.isDirectory(targetFilePath) ? path.resolve(targetFilePath, "index.html") : targetFilePath;

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
