/* eslint-disable no-console */

import { ISdServiceClientConnectionConfig } from "./ISdServiceClientConnectionConfig";
import { JsonConvert, Type, Uuid, Wait } from "@simplysm/sd-core-common";
import {
  ISdServiceErrorBody,
  SD_SERVICE_MAX_MESSAGE_SIZE,
  SD_SERVICE_SPECIAL_COMMANDS,
  SD_SERVICE_SPLIT_CHUNK_SIZE,
  SdServiceCommandHelper,
  SdServiceEventListenerBase,
  TSdServiceC2SMessage,
  TSdServiceCommand,
  TSdServiceResponse,
  TSdServiceS2CMessage,
} from "@simplysm/sd-service-common";
import { SdWebSocket } from "./SdWebSocket";
import { EventEmitter } from "events";
import { SdServiceEventBus } from "./SdServiceEventBus";
import { DefaultReconnectStrategy, IReconnectStrategy } from "./reconnect-strategy";

export class SdServiceClient extends EventEmitter {
  static isOnShowAlert = false;

  isManualClose = false;
  isConnected = false;
  websocketUrl: string;
  serverUrl: string;
  reconnectCount = 0;
  #id = Uuid.new().toString();
  #ws: SdWebSocket;
  #eventBus: SdServiceEventBus;

  // 재연결 정책
  #reconnectStrategy: IReconnectStrategy | undefined;

  constructor(
    readonly name: string,
    readonly options: ISdServiceClientConnectionConfig,
  ) {
    super();

    this.websocketUrl = `${
      this.options.ssl ? "wss" : "ws"
    }://${this.options.host}:${this.options.port}/ws`;
    this.serverUrl = `${
      this.options.ssl ? "https" : "http"
    }://${this.options.host}:${this.options.port}`;

    this.#ws = new SdWebSocket(this.websocketUrl);

    this.#eventBus = new SdServiceEventBus(
      async (command, params) => await this.#sendCommandAsync(command, params),
    );

    // 전략 주입
    this.#reconnectStrategy =
      this.options.reconnect === false
        ? undefined
        : (this.options.reconnect ?? new DefaultReconnectStrategy());
  }

  get connected(): boolean {
    return this.#ws.connected && this.isConnected;
  }

  override on(
    event: "request-progress",
    listener: (state: ISdServiceClientRequestProgressState) => void,
  ): this;
  override on(
    event: "response-progress",
    listener: (state: ISdServiceClientResponseProgressState) => void,
  ): this;
  override on(
    event: "state-change",
    listener: (state: "connected" | "closed" | "reconnect") => void,
  ): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  async #handleServerMessageAsync(msg: TSdServiceS2CMessage): Promise<void> {
    if (msg.name === "event") {
      // 서버에서 이벤트가 날아온 경우 → EventBus 통해 콜백 실행
      await this.#eventBus.handleEventAsync(msg.key, msg.body);
    } else if (
      typeof location !== "undefined" &&
      msg.name === "client-reload" &&
      this.name === msg.clientName
    ) {
      console.log("클라이언트 RELOAD 명령 수신", msg.changedFileSet);
      if (Array.from(msg.changedFileSet).every((item) => item.endsWith(".css"))) {
        for (const changedFile of msg.changedFileSet) {
          const href = "./" + changedFile.replace(/[\\/]/g, "/");
          const oldStyle = document.querySelector(`link[data-sd-style="${href}"]`) as
            | HTMLLinkElement
            | undefined;
          if (oldStyle) {
            oldStyle.href = `${href}?t=${Date.now()}`;
          }

          const oldGlobalStyle = document.querySelector(
            `link[data-sd-style="${changedFile}"],[href="${changedFile}"]`,
          ) as HTMLLinkElement | undefined;
          if (oldGlobalStyle) {
            oldGlobalStyle.setAttribute("data-sd-style", changedFile);
            oldGlobalStyle.href = `${changedFile}?t=${Date.now()}`;
          }
        }
      } else {
        if (window["__sd_hmr_destroy"] != null) {
          window["__sd_hmr_destroy"]();

          const old = document.querySelector("app-root");
          if (old) old.remove();
          document.body.prepend(document.createElement("app-root"));

          await (
            await import(`${location.pathname}main.js?t=${Date.now()}`)
          ).default;
          /*requestAnimationFrame(() => {
            console.clear();
          });*/
        } else {
          location.reload();
        }
      }
    } else if (msg.name === "client-get-id") {
      const resMsg: TSdServiceC2SMessage = { name: "client-get-id-response", body: this.#id };
      await this.#ws.sendAsync(JsonConvert.stringify(resMsg));
    } else if (msg.name === "connected") {
      this.emit("state-change", "success");
      this.isConnected = true;

      await this.#eventBus.reRegisterAllAsync();
    }
  }

  async #reconectAsync(): Promise<void> {
    // 알림 표시 중이면 기다림 (기존 동작 유지)
    await Wait.until(() => !SdServiceClient.isOnShowAlert);

    // 재연결 사용 안 할 때
    if (!this.#reconnectStrategy) {
      console.error("WebSocket 연결이 끊겼습니다. 연결상태를 확인하세요.");
      return;
    }

    // 재연결 전략에 따라 더 이상 재시도하지 않는 경우
    if (!this.#reconnectStrategy.shouldReconnect(this.reconnectCount)) {
      console.error("연결이 너무 오래 끊겨있습니다. 연결상태 확인 후, 화면을 새로고침하세요.");
      return;
    }

    // 지연 시간 계산 후 대기
    const delayMs = this.#reconnectStrategy.getDelayMs(this.reconnectCount);
    this.reconnectCount++;
    await Wait.time(delayMs);

    if (this.isConnected) {
      console.log("WebSocket 연결됨");
      return;
    }

    try {
      await this.#ws.connectAsync();

      console.log("WebSocket 재연결 성공");
    } catch (err) {
      console.error("WebSocket 재연결 실패", err);
      // 브라우저에서 에러로 connect를 못한 경우에도 "close" 이벤트가 뜨므로,
      // 여기서 재귀 호출은 굳이 하지 않고, close 핸들러에서 다시 재연결을 시도하게 둡니다.
    }
  }

  async #handleSocketCloseAsync(): Promise<void> {
    this.isConnected = false;

    if (this.isManualClose) {
      this.emit("state-change", "closed");
      console.warn("WebSocket 연결 끊김");
      this.isManualClose = false;
    } else {
      this.emit("state-change", "reconnect");
      console.warn("WebSocket 연결 끊김 (재연결 시도)");
      await this.#reconectAsync();
    }
  }

  async connectAsync(): Promise<void> {
    if (this.isConnected) return;

    await new Promise<void>(async (resolve, reject) => {
      this.#ws.on("message", async (msgJson) => {
        const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
        await this.#handleServerMessageAsync(msg);

        if (msg.name === "connected") {
          resolve();
        }
      });

      this.#ws.on("close", async () => {
        await this.#handleSocketCloseAsync();
      });

      try {
        await this.#ws.connectAsync();
      } catch (err) {
        console.error("WebSocket 최초 연결 실패", err);
        reject(err);
      }
    });
  }

  async closeAsync(): Promise<void> {
    this.isManualClose = true;
    await this.#ws.closeAsync();
  }

  async sendAsync<R = unknown>(
    serviceName: string,
    methodName: string,
    params: unknown[],
  ): Promise<R> {
    const cmd = SdServiceCommandHelper.buildMethodCommand({ serviceName, methodName });
    return await this.#sendCommandAsync<R>(cmd, params);
  }

  async addEventListenerAsync<T extends SdServiceEventListenerBase<any, any>>(
    eventListenerType: Type<T>,
    info: T["info"],
    cb: (data: T["data"]) => PromiseLike<void>,
  ): Promise<string> {
    if (!this.connected) {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }

    // EventBus에 위임: 서버 등록 + 콜백/정보 저장까지 한 번에
    return await this.#eventBus.addListenerAsync(eventListenerType, info, cb);
  }

  async emitAsync<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ): Promise<void> {
    const listenerInfos: {
      key: string;
      info: T["info"];
    }[] = await this.#sendCommandAsync(SD_SERVICE_SPECIAL_COMMANDS.GET_EVENT_LISTENER_INFOS, [
      eventType.name,
    ]);
    const targetListenerKeys = listenerInfos
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    await this.#sendCommandAsync(SD_SERVICE_SPECIAL_COMMANDS.EMIT_EVENT, [
      targetListenerKeys,
      data,
    ]);
  }

  async removeEventListenerAsync(key: string): Promise<void> {
    await this.#eventBus.removeListenerAsync(key);
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

  async #sendCommandAsync<R = unknown>(command: TSdServiceCommand, params: unknown[]): Promise<R> {
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

      const splitResInfo: { completedSize: number; data: string[] } = {
        completedSize: 0,
        data: [],
      };
      const msgFn = (msgJson: string): void => {
        const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
        if (
          msg.name !== "response" &&
          msg.name !== "response-for-split" &&
          msg.name !== "response-split"
        )
          return;
        if (msg.reqUuid !== uuid) return;

        if (msg.name === "response-for-split") {
          this.emit("request-progress", {
            uuid,
            fullSize: reqText.length,
            completedSize: msg.completedSize,
          });
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
            const res = JsonConvert.parse(splitResInfo.data.join("")) as TSdServiceResponse;

            this.#ws.off("message", msgFn);

            if (res.state === "error") {
              reject(this.#toError(res.body));
              return;
            }

            resolve(res.body);
          }
        } else {
          this.#ws.off("message", msgFn);

          if (msg.state === "error") {
            reject(this.#toError(msg.body));
            return;
          }

          resolve(msg.body);
        }
      };
      this.#ws.on(`message`, msgFn);

      if (reqText.length > SD_SERVICE_MAX_MESSAGE_SIZE) {
        this.emit("request-progress", { uuid, fullSize: reqText.length, completedSize: 0 });

        const splitSize = SD_SERVICE_SPLIT_CHUNK_SIZE;

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

  #toError(body: ISdServiceErrorBody): Error {
    const err = new Error(body.message);
    (err as any).code = body.code;
    if (body.stack != null) err.stack = body.stack;
    return err;
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
