/* eslint-disable no-console */

import {ISdServiceClientConnectionConfig} from "./ISdServiceClientConnectionConfig";
import {JsonConvert, Type, Uuid, Wait} from "@simplysm/sd-core-common";
import {
  ISdServiceResponse,
  SdServiceEventListenerBase,
  TSdServiceC2SMessage,
  TSdServiceS2CMessage
} from "@simplysm/sd-service-common";
import {SdWebSocket} from "./SdWebSocket";
import {EventEmitter} from "events";

export class SdServiceClient extends EventEmitter {
  public static isOnShowAlert = false;
  public isManualClose = false;
  public isConnected = false;
  public websocketUrl: string;
  public serverUrl: string;
  public reconnectCount = 0;
  private readonly _id = Uuid.new().toString();
  private readonly _ws: SdWebSocket;

  public constructor(private readonly _name: string,
                     public readonly options: ISdServiceClientConnectionConfig) {
    super();

    this.websocketUrl = `${this.options.ssl ? "wss" : "ws"}://${this.options.host}:${this.options.port}`;
    this.serverUrl = `${this.options.ssl ? "https" : "http"}://${this.options.host}:${this.options.port}`;
    this._ws = new SdWebSocket(this.websocketUrl);
  }

  public get connected(): boolean {
    return this._ws.connected && this.isConnected;
  }

  public override on(event: "request-progress", listener: (state: ISdServiceClientRequestProgressState) => void): this;
  public override on(event: "response-progress", listener: (state: ISdServiceClientResponseProgressState) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async connectAsync(): Promise<void> {
    if (this.isConnected) return;

    await new Promise<void>(async (resolve, reject) => {
      this._ws.on("message", async (msgJson) => {
        const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (typeof location !== "undefined" && msg.name === "client-reload") {
          console.log("클라이언트 RELOAD 명령 수신");
          location.reload();
        }
        else if (msg.name === "client-get-id") {
          const resMsg: TSdServiceC2SMessage = {name: "client-get-id-response", body: this._id};
          await this._ws.sendAsync(JsonConvert.stringify(resMsg));
        }
        else if (msg.name === "connected") {
          this.isConnected = true;
          resolve();
        }
      });

      const reconnectFn = async (): Promise<void> => {
        await Wait.until(() => !SdServiceClient.isOnShowAlert);

        if (!this.options.useReconnect) {
          console.error("WebSocket 연결이 끊겼습니다. 연결상태를 확인하세요.");
          return;
        }
        else if (this.reconnectCount > 100) {
          console.error("연결이 너무 오래 끊겨있습니다. 연결상태 확인 후, 화면을 새로고침하세요.");
          return;
        }
        else {
          this.reconnectCount++;
          await Wait.time(2000);
        }

        if (this.isConnected) {
          console.log("WebSocket 연결됨");
          return;
        }

        try {
          await this._ws.connectAsync();
          console.log("WebSocket 재연결 성공");
        }
        catch (err) {
          console.warn("WebSocket 재연결 실패, 재시도");
          await reconnectFn();
        }
      };

      this._ws.on("close", async () => {
        this.isConnected = false;

        if (this.isManualClose) {
          console.warn("WebSocket 연결 끊김");
          this.isManualClose = false;
        }
        else {
          console.warn("WebSocket 연결 끊김 (재연결 시도)");
          await reconnectFn();
        }
      });

      try {
        await this._ws.connectAsync();
      }
      catch (err) {
        reject(err);
      }
    });
  }

  public async closeAsync(): Promise<void> {
    this.isManualClose = true;
    await this._ws.closeAsync();
  }

  public async sendAsync(serviceName: string, methodName: string, params: any[]): Promise<any> {
    return await this._sendCommandAsync(`${serviceName}.${methodName}`, params);
  }

  public async addEventListenerAsync<T extends SdServiceEventListenerBase<any, any>>(eventListenerType: Type<T>,
                                                                                     info: T["info"],
                                                                                     cb: (data: T["data"]) => PromiseLike<void>): Promise<string> {
    if (!this.connected) {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }

    const key = Uuid.new().toString();
    this._ws.on(`message`, async (msgJson: string) => {
      const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
      if (msg.name !== "event") return;
      if (msg.key !== key) return;

      await cb(msg.body);
    });

    await this._sendCommandAsync("addEventListener", [key, eventListenerType.name, info]);

    return key;
  }

  public async emitAsync<T extends SdServiceEventListenerBase<any, any>>(eventType: Type<T>,
                                                                         infoSelector: (item: T["info"]) => boolean,
                                                                         data: T["data"]): Promise<void> {
    const listenerInfos: {
      key: string;
      info: T["info"]
    }[] = await this._sendCommandAsync("getEventListenerInfos", [eventType.name]);
    const targetListenerKeys = listenerInfos
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    await this._sendCommandAsync("emitEvent", [targetListenerKeys, data]);
  }

  public async removeEventListenerAsync(key: string): Promise<void> {
    await this._sendCommandAsync("removeEventListener", [key]);
  }

  public async downloadFileBufferAsync(relPath: string): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `${this.serverUrl}${(relPath.startsWith("/") ? "" : "/")}${relPath}`, true);
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

  private async _sendCommandAsync(command: string, params: any[]): Promise<any> {
    const uuid = Uuid.new().toString();

    return await new Promise<any>(async (resolve, reject) => {
      const req: TSdServiceC2SMessage = {
        name: "request",
        clientName: this._name,
        uuid,
        command,
        params
      };

      const reqText = JsonConvert.stringify(req);

      const splitResInfo: { completedSize: number; data: string[] } = {completedSize: 0, data: []};
      const msgFn = (msgJson: string): void => {
        const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
        if (msg.name !== "response" && msg.name !== "response-for-split" && msg.name !== "response-split") return;
        if (msg.reqUuid !== uuid) return;

        if (msg.name === "response-for-split") {
          this.emit("request-progress", {uuid, fullSize: reqText.length, completedSize: msg.completedSize});
        }
        else if (msg.name === "response-split") {
          splitResInfo.data[msg.index] = msg.body;
          splitResInfo.completedSize += msg.body.length;
          const isCompleted = splitResInfo.completedSize === msg.fullSize;

          this.emit("response-progress", {
            reqUuid: uuid,
            fullSize: msg.fullSize,
            completedSize: splitResInfo.completedSize
          });

          if (isCompleted) {
            const res = JsonConvert.parse(splitResInfo.data.join("")) as ISdServiceResponse;

            this._ws.off("message", msgFn);

            if (res.state === "error") {
              reject(new Error(res.body));
              return;
            }

            resolve(res.body);
          }
        }
        else {
          this._ws.off("message", msgFn);

          if (msg.state === "error") {
            reject(new Error(msg.body));
            return;
          }

          resolve(msg.body);
        }
      };
      this._ws.on(`message`, msgFn);

      if (reqText.length > 3 * 1000 * 1000) {
        this.emit("request-progress", {uuid, fullSize: reqText.length, completedSize: 0});

        const splitSize = 300 * 1000;

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
}

export interface ISdServiceClientRequestProgressState {
  uuid: string;
  fullSize: number;
  completedSize: number;
}

export interface ISdServiceClientResponseProgressState {
  reqUuid: string;
  fullSize: number;
  completedSize: number;
}

