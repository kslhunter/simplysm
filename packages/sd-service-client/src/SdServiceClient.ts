import { ISdServiceClientConnectionConfig } from "./ISdServiceClientConnectionConfig";
import * as socketIo from "socket.io-client";
import { Type, Uuid, Wait } from "@simplysm/sd-core-common";
import { ISdServiceRequest, ISdServiceResponse, SdServiceEventBase } from "@simplysm/sd-service-common";

export class SdServiceClient {
  private _socket?: socketIo.Socket;

  public get connected(): boolean {
    return this._socket?.connected ?? false;
  }

  public constructor(private readonly _options: ISdServiceClientConnectionConfig) {
  }

  public async connectAsync(): Promise<void> {
    if (this._socket?.connected) return;

    await new Promise<void>((resolve, reject) => {
      this._socket = socketIo.io(`${this._options.ssl ? "wss" : "ws"}://${this._options.host}:${this._options.port}`);

      this._socket.on("connect", () => {
        resolve();
      });

      this._socket.on("connect_error", (err) => {
        reject(err);
      });
    });
  }

  public async closeAsync(): Promise<void> {
    if (!this._socket?.connected) return;
    this._socket.disconnect();
    await Wait.until(() => !(this._socket?.connected));
  }

  public async sendAsync(serviceName: string, methodName: string, params: any[]): Promise<any> {
    return await this._sendCommandAsync(`${serviceName}.${methodName}`, params);
  }

  private async _sendCommandAsync(command: string, params: any[]): Promise<any> {
    return await new Promise<any>((resolve, reject) => {
      if (!this._socket?.connected) {
        reject(new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요."));
        return;
      }

      const req: ISdServiceRequest = {
        uuid: Uuid.new().toString(),
        command,
        params
      };

      this._socket.once(`response:${req.uuid}`, (res: ISdServiceResponse) => {
        if (res.type === "error") {
          reject(new Error(res.body));
          return;
        }

        resolve(res.body);
      });

      this._socket.emit("request", req);
    });
  }

  public async addEventListenerAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>,
                                                                             info: T["info"],
                                                                             cb: (data: T["data"]) => PromiseLike<void>): Promise<void> {
    if (!this._socket?.connected) {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }

    const key = Uuid.new().toString();
    this._socket.on(`event:${key}`, async (data) => {
      await cb(data);
    });

    await this._sendCommandAsync("addEventListener", [key, eventType.name, info]);
  }

  public async emitAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>,
                                                                 infoSelector: (item: T["info"]) => boolean,
                                                                 data: T["data"]): Promise<void> {
    const listenerInfos: { key: string; info: T["info"] }[] = await this._sendCommandAsync("getEventListenerInfos", [eventType.name]);
    const targetListenerKeys = listenerInfos
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    await this._sendCommandAsync("emitEvent", [targetListenerKeys, data]);
  }
}
