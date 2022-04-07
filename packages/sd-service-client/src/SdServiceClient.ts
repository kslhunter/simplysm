import { ISdServiceClientConnectionConfig } from "./ISdServiceClientConnectionConfig";
import { JsonConvert, Type, Uuid, Wait } from "@simplysm/sd-core-common";
import { SdServiceEventBase, TSdServiceC2SMessage, TSdServiceS2CMessage } from "@simplysm/sd-service-common";
import { SdWebSocket } from "./SdWebSocket";

export class SdServiceClient {
  public readonly id = Uuid.new().toString();

  private readonly _ws: SdWebSocket;

  public isManualClose = false;

  public get connected(): boolean {
    return this._ws.connected;
  }

  public constructor(private readonly _name: string,
                     public readonly options: ISdServiceClientConnectionConfig) {
    this._ws = new SdWebSocket(`${this.options.ssl ? "wss" : "ws"}://${this.options.host}:${this.options.port}`);
  }

  public async connectAsync(): Promise<void> {
    if (this._ws.connected) return;

    this._ws.on("message", async (msgJson) => {
      const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,@typescript-eslint/strict-boolean-expressions
      if (location?.reload && msg.name === "client-reload") {
        // eslint-disable-next-line no-console
        console.log("클라이언트 RELOAD 명령 수신");
        location.reload();
      }
      else if (msg.name === "client-get-id") {
        const resMsg: TSdServiceC2SMessage = { name: "client-get-id-response", body: this.id };
        await this._ws.sendAsync(JsonConvert.stringify(resMsg));
      }
    });


    const reconnectFn = async (): Promise<void> => {
      if (this.isManualClose) return;
      try {
        await this.connectAsync();
        // eslint-disable-next-line no-console
        console.log("WebSocket 재연결");
      }
      catch (err) {
        await Wait.time(500);
        await reconnectFn();
      }
    };

    this._ws.on("close", async () => {
      // eslint-disable-next-line no-console
      console.warn("WebSocket 연결 끊김");
      await reconnectFn();
    });

    await this._ws.connectAsync();
  }

  public async closeAsync(): Promise<void> {
    this.isManualClose = true;
    await this._ws.closeAsync();
  }

  public async sendAsync(serviceName: string, methodName: string, params: any[]): Promise<any> {
    return await this._sendCommandAsync(`${serviceName}.${methodName}`, params);
  }

  private async _sendCommandAsync(command: string, params: any[]): Promise<any> {
    const uuid = Uuid.new().toString();

    return await new Promise<any>(async (resolve, reject) => {
      const msgFn = (msgJson: string): void => {
        const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
        if (msg.name !== "response") return;
        if (msg.reqUuid !== uuid) return;

        this._ws.off("message", msgFn);

        if (msg.state === "error") {
          reject(new Error(msg.body));
          return;
        }

        resolve(msg.body);
      };
      this._ws.on(`message`, msgFn);

      const req: TSdServiceC2SMessage = {
        name: "request",
        clientName: this._name,
        uuid,
        command,
        params
      };

      const reqText = JsonConvert.stringify(req);
      if (reqText.length > 1000 * 1000) {
        const splitSize = 1000 * 100;

        let index = 0;
        let currSize = 0;
        while (currSize !== reqText.length) {
          const splitBody = reqText.substring(currSize, currSize + splitSize - 1);
          const splitReq: TSdServiceC2SMessage = {
            name: "request-split",
            uuid: req.uuid,
            fullSize: reqText.length,
            index,
            body: splitBody
          };
          await this._ws.sendAsync(JsonConvert.stringify(splitReq));
          currSize += splitBody.length;
          index++;
        }
      }
      else {
        await this._ws.sendAsync(reqText);
      }
    });
  }

  public async addEventListenerAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>,
                                                                             info: T["info"],
                                                                             cb: (data: T["data"]) => PromiseLike<void>): Promise<string> {
    if (!this._ws.connected) {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }

    const key = Uuid.new().toString();
    this._ws.on(`message`, async (msgJson: string) => {
      const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
      if (msg.name !== "event") return;
      if (msg.key !== key) return;

      await cb(JsonConvert.parse(msg.body));
    });

    await this._sendCommandAsync("addEventListener", [key, eventType.name, info]);

    return key;
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

  public async removeEventListenerAsync(key: string): Promise<void> {
    await this._sendCommandAsync("removeEventListener", [key]);
  }

  public async downloadAsync(relPath: string): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `${Boolean(this.options.ssl) ? "https" : "http"}://${this.options.host}:${this.options.port}${(relPath.startsWith("/") ? "" : "/")}${relPath}`, true);
      xhr.responseType = "arraybuffer";

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(Buffer.from(xhr.response));
        }
        else {
          reject(new Error(xhr.status.toString()));
        }
      };
      xhr.onerror = (err) => {
        reject(err);
      };

      xhr.send();
    });
  }
}
