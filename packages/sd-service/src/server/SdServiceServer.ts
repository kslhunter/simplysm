import * as https from "https";
import * as http from "http";
import * as socketIo from "socket.io";
import { ISdServiceServerOptions } from "./commons";
import { ISdServiceRequest } from "../commons";
import { Logger } from "@simplysm/sd-core-node";

export class SdServiceServer {
  private readonly _logger = Logger.get(["simplysm", "sd-service", this.constructor.name]);

  private _httpServer?: http.Server | https.Server;
  public isOpen = false;

  public constructor(private readonly _options: ISdServiceServerOptions) {
  }

  public async listenAsync(): Promise<void> {
    await new Promise<void>((resolve) => {
      this._logger.debug("서버 시작...");

      this._httpServer = this._options.ssl
        ? https.createServer({
          pfx: this._options.ssl.pfxBuffer,
          passphrase: this._options.ssl.passphrase
        })
        : http.createServer();

      const socketServer = new socketIo.Server(this._httpServer);
      socketServer.on("connection", (socket) => this._onSocketConnection(socket));
      this._httpServer.listen(this._options.port, () => {
        resolve();
        this._logger.debug("서버 시작됨");
      });
    });

    this.isOpen = true;
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._httpServer?.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  private _onSocketConnection(socket: socketIo.Socket): void {
    this._logger.debug("클라이언트 연결됨");

    socket.on("request", async (req: ISdServiceRequest) => {
      this._logger.debug("요청 받음", req);

      try {
        // 서비스 가져오기
        const serviceClass = this._options.services.single((item) => item.name === req.serviceName);
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
}
