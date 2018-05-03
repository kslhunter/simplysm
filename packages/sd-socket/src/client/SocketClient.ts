import * as sio from "socket.io-client";
import { Exception, JsonConvert, Logger, NotImplementedException, Type, Uuid } from "../../../sd-core/src";
import { ISocketEvent } from "../common/ISocketEvent";
import { ISocketRequest } from "../common/ISocketRequest";
import { ISocketResponse } from "../common/ISocketResponse";
import Socket = SocketIOClient.Socket;

export class SocketClient {
  private _logger = new Logger("@simplism/sd-socket", "SocketClient");
  private _socket?: Socket;
  private _url?: string;
  private _reloadId?: Uuid;

  public get connected(): boolean {
    return (this._socket && this._socket.connected) || false;
  }

  public async connect(url?: string): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
      this._url = `ws://${url || location.host}`;

      const prevSocket = sio.managers[this._url] && sio.managers[this._url].connecting[0];
      if (prevSocket) {
        this._socket = prevSocket;
        return;
      }

      this._logger.log("connect");

      this._socket = sio(this._url, {
        transports: ["websocket"],
        rejectUnauthorized: process.env.NODE_ENV === "production"
      });

      this._socket.on("connect", async () => {
        this._logger.info(`connect: ${this._socket!.id}`);
        resolve();
      });

      this._socket.on("connect_error", (err: Error) => {
        reject(err);
      });
    });
  }

  public async close(): Promise<void> {
    if (this._reloadId) {
      await this.off(this._reloadId);
    }
    if (this._socket && this._socket.connected) {
      this._socket.close();
    }
  }

  public async on<T extends ISocketEvent<any, any>>(eventType: Type<T>, info: T["info"], callback: (result: T["data"]) => void | Promise<void>): Promise<Uuid> {
    const id = await this._send("addListener", [{
      event: eventType.name,
      info
    }]);

    this._socket!.on(`on(${eventType.name})`, async (dataJson: string) => {
      await callback(JsonConvert.parse(dataJson));
    });

    return id;
  }

  public async off(id: Uuid): Promise<void> {
    await this._send("removeListener", [id]);
  }

  public async send(cmd: string, args: any[], header?: { [key: string]: any }): Promise<any> {
    //-- 연결되지 않은 경우 500ms를 기다린 후 다시 연결여부를 확인해 본다.
    // (연결되기 전에 명령을 보내는 경우, 문제가 발생하는 현상 수정)
    if (!this.connected) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 500);
      });
      if (!this.connected) {
        throw new Exception("소켓이 연결되지 않았습니다.\n인터넷 연결을 확인하세요.");
      }
    }

    //-- 전송
    return await this._send(cmd, args, header);
  }

  private async _send(cmd: string, args?: any[], header?: { [key: string]: any }): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const requestId = Uuid.newUuid();

      //-- 결과받기 이벤트
      this._socket!.once(`response(${requestId})`, (responseJson: string) => {
        const response: ISocketResponse = JsonConvert.parse(responseJson);
        this._logger.log("response received", JsonConvert.stringify(response, {
          space: 2,
          hideBuffer: true
        }));

        if (response.header.success) {
          if (response.header.fileToken) {
            const downloadUrl = `http://${this._url}/_download/${response.header.fileToken}`;
            if (!document) {
              reject(new NotImplementedException());
              return;
            }
            const anchorElement = document.createElement("a");
            anchorElement.href = downloadUrl;
            anchorElement.click();
            resolve();
          }
          else {
            resolve(response.body);
          }
        }
        else {
          reject(response.body);
        }
      });

      //-- 요청 전송
      const request: ISocketRequest = {
        header: {
          id: requestId,
          cmd,
          origin: !location ? "" : `${location.protocol}//${location.host}`,
          ...header
        },
        body: args
      };

      this._logger.log("request", JsonConvert.stringify(request, {
        space: 2,
        hideBuffer: true
      }));
      const requestJson = JsonConvert.stringify(request);
      this._socket!.emit("request", requestJson);
    });
  }
}