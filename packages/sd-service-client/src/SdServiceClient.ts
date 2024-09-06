/* eslint-disable no-console */

import { ISdServiceClientConnectionConfig } from "./ISdServiceClientConnectionConfig";
import { JsonConvert, Type, Uuid, Wait } from "@simplysm/sd-core-common";
import {
  ISdServiceResponse,
  SdServiceEventListenerBase,
  TSdServiceC2SMessage,
  TSdServiceS2CMessage
} from "@simplysm/sd-service-common";
import { SdWebSocket } from "./SdWebSocket";
import { EventEmitter } from "events";

export class SdServiceClient extends EventEmitter {
  static isOnShowAlert = false;

  isManualClose = false;
  isConnected = false;
  websocketUrl: string;
  serverUrl: string;
  reconnectCount = 0;
  readonly #id = Uuid.new().toString();
  readonly #ws: SdWebSocket;
  readonly #eventListenerInfoMap = new Map<string, { name: string; info: any }>();

  constructor(
    public readonly name: string,
    public readonly options: ISdServiceClientConnectionConfig,
  ) {
    super();

    this.websocketUrl = `${this.options.ssl ? "wss" : "ws"}://${this.options.host}:${this.options.port}`;
    this.serverUrl = `${this.options.ssl ? "https" : "http"}://${this.options.host}:${this.options.port}`;
    this.#ws = new SdWebSocket(this.websocketUrl);
  }

  get connected(): boolean {
    return this.#ws.connected && this.isConnected;
  }

  override on(event: "request-progress", listener: (state: ISdServiceClientRequestProgressState) => void): this;
  override on(event: "response-progress", listener: (state: ISdServiceClientResponseProgressState) => void): this;
  override on(event: "state-change", listener: (state: "connected" | "closed" | "reconnect") => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  async connectAsync(): Promise<void> {
    if (this.isConnected) return;

    await new Promise<void>(async (resolve, reject) => {
      this.#ws.on("message", async (msgJson) => {
        const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
        if (typeof location !== "undefined" && msg.name === "client-reload") {
          console.log("클라이언트 RELOAD 명령 수신");
          location.reload();
        } else if (msg.name === "client-get-id") {
          const resMsg: TSdServiceC2SMessage = { name: "client-get-id-response", body: this.#id };
          await this.#ws.sendAsync(JsonConvert.stringify(resMsg));
        } else if (msg.name === "connected") {
          this.emit("state-change", "success");
          this.isConnected = true;

          for (const entry of this.#eventListenerInfoMap.entries()) {
            await this.#sendCommandAsync("addEventListener", [entry[0], entry[1].name, entry[1].info]);
          }

          resolve();
        }
      });

      const reconnectFn = async (): Promise<void> => {
        await Wait.until(() => !SdServiceClient.isOnShowAlert);

        if (!this.options.useReconnect) {
          console.error("WebSocket 연결이 끊겼습니다. 연결상태를 확인하세요.");
          return;
        } else if (this.reconnectCount > 100) {
          console.error("연결이 너무 오래 끊겨있습니다. 연결상태 확인 후, 화면을 새로고침하세요.");
          return;
        } else {
          this.reconnectCount++;
          await Wait.time(2000);
        }

        if (this.isConnected) {
          console.log("WebSocket 연결됨");
          return;
        }

        try {
          await this.#ws.connectAsync();

          console.log("WebSocket 재연결 성공");
        } catch {
          console.warn("WebSocket 재연결 실패");
          // browser에서 에러로 connect를 못한 경우에도, "close" 이벤트가 뜨므로, 아래 코드 주석처리
          /*await reconnectFn();*/
        }
      };

      this.#ws.on("close", async () => {
        this.isConnected = false;

        if (this.isManualClose) {
          this.emit("state-change", "closed");
          console.warn("WebSocket 연결 끊김");
          this.isManualClose = false;
        } else {
          this.emit("state-change", "reconnect");
          console.warn("WebSocket 연결 끊김 (재연결 시도)");
          await reconnectFn();
        }
      });

      try {
        await this.#ws.connectAsync();
      } catch (err) {
        reject(err);
      }
    });
  }

  async closeAsync(): Promise<void> {
    this.isManualClose = true;
    await this.#ws.closeAsync();
  }

  async sendAsync(serviceName: string, methodName: string, params: any[]): Promise<any> {
    return await this.#sendCommandAsync(`${serviceName}.${methodName}`, params);
  }

  async addEventListenerAsync<T extends SdServiceEventListenerBase<any, any>>(
    eventListenerType: Type<T>,
    info: T["info"],
    cb: (data: T["data"]) => PromiseLike<void>,
  ): Promise<string> {
    if (!this.connected) {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }

    const key = Uuid.new().toString();
    this.#ws.on(`message`, async (msgJson: string) => {
      const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
      if (msg.name !== "event") return;
      if (msg.key !== key) return;

      await cb(msg.body);
    });

    await this.#sendCommandAsync("addEventListener", [key, eventListenerType.name, info]);

    this.#eventListenerInfoMap.set(key, {
      name: eventListenerType.name,
      info,
    });

    return key;
  }

  async emitAsync<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ): Promise<void> {
    const listenerInfos: {
      key: string;
      info: T["info"];
    }[] = await this.#sendCommandAsync("getEventListenerInfos", [eventType.name]);
    const targetListenerKeys = listenerInfos.filter((item) => infoSelector(item.info)).map((item) => item.key);

    await this.#sendCommandAsync("emitEvent", [targetListenerKeys, data]);
  }

  async removeEventListenerAsync(key: string): Promise<void> {
    await this.#sendCommandAsync("removeEventListener", [key]);

    this.#eventListenerInfoMap.delete(key);
  }

  async downloadFileBufferAsync(relPath: string): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `${this.serverUrl}${relPath.startsWith("/") ? "" : "/"}${relPath}`, true);
      xhr.responseType = "arraybuffer";

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(Buffer.from(xhr.response));
        } else {
          reject(new Error(xhr.status.toString()));
        }
      };
      xhr.onerror = (err) => {
        reject(err);
      };

      xhr.send();
    });
  }

  async #sendCommandAsync(command: string, params: any[]): Promise<any> {
    const uuid = Uuid.new().toString();

    return await new Promise<any>(async (resolve, reject) => {
      const req: TSdServiceC2SMessage = {
        name: "request",
        clientName: this.name,
        uuid,
        command,
        params,
      };

      const reqText = JsonConvert.stringify(req);

      const splitResInfo: { completedSize: number; data: string[] } = { completedSize: 0, data: [] };
      const msgFn = (msgJson: string): void => {
        const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
        if (msg.name !== "response" && msg.name !== "response-for-split" && msg.name !== "response-split") return;
        if (msg.reqUuid !== uuid) return;

        if (msg.name === "response-for-split") {
          this.emit("request-progress", { uuid, fullSize: reqText.length, completedSize: msg.completedSize });
        } else if (msg.name === "response-split") {
          splitResInfo.data[msg.index] = msg.body;
          splitResInfo.completedSize += msg.body.length;
          const isCompleted = splitResInfo.completedSize === msg.fullSize;

          this.emit("response-progress", {
            reqUuid: uuid,
            fullSize: msg.fullSize,
            completedSize: splitResInfo.completedSize,
          });

          if (isCompleted) {
            const res = JsonConvert.parse(splitResInfo.data.join("")) as ISdServiceResponse;

            this.#ws.off("message", msgFn);

            if (res.state === "error") {
              reject(new Error(res.body));
              return;
            }

            resolve(res.body);
          }
        } else {
          this.#ws.off("message", msgFn);

          if (msg.state === "error") {
            reject(new Error(msg.body));
            return;
          }

          resolve(msg.body);
        }
      };
      this.#ws.on(`message`, msgFn);

      if (reqText.length > 3 * 1000 * 1000) {
        this.emit("request-progress", { uuid, fullSize: reqText.length, completedSize: 0 });

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
            body: splitBody,
          };
          await this.#ws.sendAsync(JsonConvert.stringify(splitReq));
          currSize += splitBody.length;
          index++;
        }
      } else {
        await this.#ws.sendAsync(reqText);
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
