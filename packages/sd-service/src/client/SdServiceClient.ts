import { ISdServiceClientConnectionConfig } from "./commons";
import * as socketIo from "socket.io-client";
import { ISdServiceRequest, ISdServiceResponse } from "../commons";
import { Uuid } from "@simplysm/sd-core-common";
import { Logger } from "@simplysm/sd-core-node";

export class SdServiceClient {
  private readonly _logger = Logger.get(["simplysm", "sd-service", this.constructor.name]);

  private _socket?: socketIo.Socket;

  public constructor(private readonly _options: ISdServiceClientConnectionConfig) {
  }

  public async connectAsync(): Promise<void> {
    if (this._socket?.connected) return;

    this._logger.debug("서버 연결");
    await new Promise<void>((resolve, reject) => {
      this._socket = socketIo.io(`${this._options.ssl ? "wss" : "ws"}://${this._options.host}:${this._options.port}`);

      this._socket.on("connect", () => {
        this._logger.debug("서버 연결됨");
        resolve();
      });

      this._socket.on("connect_error", (err) => {
        this._logger.error("서버 연결 오류");
        reject(err);
      });
    });
  }

  public async sendAsync(serviceName: string, methodName: string, params: any[]): Promise<any> {
    return await new Promise<any>((resolve, reject) => {
      if (!this._socket?.connected) {
        reject(new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요."));
        return;
      }

      const req: ISdServiceRequest = {
        uuid: Uuid.new().toString(),
        serviceName,
        methodName,
        params
      };

      this._socket.once(`response:${req.uuid}`, (res: ISdServiceResponse) => {
        if (res.type === "error") {
          reject(new Error(res.body));
          return;
        }

        resolve(res.body);
      });

      this._logger.debug("요청보내기", req);
      this._socket.emit("request", req);
    });
  }
}
