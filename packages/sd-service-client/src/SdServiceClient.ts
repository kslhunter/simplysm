/* eslint-disable no-console */

import { ISdServiceConnectionConfig } from "./types/ISdServiceConnectionConfig";
import { JsonConvert, Type, Uuid, Wait } from "@simplysm/sd-core-common";
import {
  SD_SERVICE_SPECIAL_COMMANDS,
  SdServiceCommandHelper,
  SdServiceEventListenerBase,
  TSdServiceS2CMessage,
} from "@simplysm/sd-service-common";
import { SdWebSocket } from "./internal/SdWebSocket";
import { EventEmitter } from "events";
import { SdServiceEventBus } from "./internal/SdServiceEventBus";
import {
  ISdServiceReconnectStrategy,
  SdServiceDefaultReconnectStrategy,
} from "./types/reconnect-strategy.types";
import { SdServiceTransport } from "./internal/SdServiceTransport";
import { ISdServiceProgressState } from "./types/ISdServiceProgressState";

export class SdServiceClient extends EventEmitter {
  isManualClose = false;
  isConnected = false;
  websocketUrl: string;
  serverUrl: string;
  reconnectCount = 0;
  #id = Uuid.new().toString();
  #ws: SdWebSocket;

  #transport: SdServiceTransport;
  #eventBus: SdServiceEventBus;

  // 재연결 정책
  #reconnectStrategy: ISdServiceReconnectStrategy | undefined;

  override on(event: "request-progress", listener: (state: ISdServiceProgressState) => void): this;
  override on(event: "response-progress", listener: (state: ISdServiceProgressState) => void): this;
  override on(
    event: "state-change",
    listener: (state: "connected" | "closed" | "reconnect") => void,
  ): this;
  override on(event: "client-reload", listener: (changedFileSet: Set<string>) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  constructor(
    readonly name: string,
    readonly options: ISdServiceConnectionConfig,
  ) {
    super();

    this.websocketUrl = `${
      this.options.ssl ? "wss" : "ws"
    }://${this.options.host}:${this.options.port}/ws`;
    this.serverUrl = `${
      this.options.ssl ? "https" : "http"
    }://${this.options.host}:${this.options.port}`;

    this.#ws = new SdWebSocket(this.websocketUrl);
    this.#transport = new SdServiceTransport(this.#ws, this.name);
    this.#eventBus = new SdServiceEventBus(this.#transport);

    // 전략 주입
    this.#reconnectStrategy =
      this.options.reconnectStrategy === false
        ? undefined
        : (this.options.reconnectStrategy ?? new SdServiceDefaultReconnectStrategy());
  }

  get connected(): boolean {
    return this.#ws.connected && this.isConnected;
  }

  // 타입 안전성을 위한 Proxy 생성 메소드
  getService<T>(serviceName: string): TRemoteService<T> {
    return new Proxy({} as TRemoteService<T>, {
      get: (target, prop) => {
        const methodName = String(prop);
        return async (...params: any[]) => {
          return await this.sendAsync(serviceName, methodName, params);
        };
      },
    });
  }

  async #handleServerMessageAsync(msg: TSdServiceS2CMessage): Promise<void> {
    // 서버에서 이벤트가 날아온 경우 → EventBus 통해 콜백 실행
    if (msg.name === "event") {
      await this.#eventBus.handleEventAsync(msg.key, msg.body);
    }
    // 클라이언트 리로드
    else if (
      typeof location !== "undefined" &&
      msg.name === "client-reload" &&
      this.name === msg.clientName
    ) {
      console.log("클라이언트 RELOAD 명령 수신", msg.changedFileSet);
      // await this.#reloadAsync(msg.changedFileSet);
      this.emit("client-reload", msg.changedFileSet); // 이벤트를 발생시켜 외부에서 처리하도록 위임
    }
    // 클라이언트 소켓 ID 가져오기
    else if (msg.name === "client-get-id") {
      await this.#transport.sendMessageAsync({ name: "client-get-id-response", body: this.#id });
    }
    // 서버 재 연결시, 리스너 재등록
    else if (msg.name === "connected") {
      this.emit("state-change", "success");
      this.isConnected = true;

      await this.#eventBus.reRegisterAllAsync();
    }
  }

  async #reconectAsync(): Promise<void> {
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

  async sendAsync(serviceName: string, methodName: string, params: any[]): Promise<any> {
    const cmd = SdServiceCommandHelper.buildMethodCommand({ serviceName, methodName });
    return await this.#transport.sendCommandAsync(cmd, params, {
      request: (state) => this.emit("request-progress", state),
      response: (state) => this.emit("response-progress", state),
    });
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

  async removeEventListenerAsync(key: string): Promise<void> {
    await this.#eventBus.removeListenerAsync(key);
  }

  async emitAsync<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ): Promise<void> {
    const listenerInfos: {
      key: string;
      info: T["info"];
    }[] = await this.#transport.sendCommandAsync(
      SD_SERVICE_SPECIAL_COMMANDS.GET_EVENT_LISTENER_INFOS,
      [eventType.name],
    );
    const targetListenerKeys = listenerInfos
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    await this.#transport.sendCommandAsync(SD_SERVICE_SPECIAL_COMMANDS.EMIT_EVENT, [
      targetListenerKeys,
      data,
    ]);
  }

  async downloadFileBufferAsync(relPath: string): Promise<Buffer> {
    const url = `${this.serverUrl}${relPath.startsWith("/") ? "" : "/"}${relPath}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(res.status.toString());
    }

    // ArrayBuffer를 받아 Buffer로 변환
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * [NEW] HTTP 파일 업로드 (대용량 전송용)
   * WebSocket을 통하지 않고 HTTP POST로 직접 전송합니다.
   * @param files 업로드할 File 객체 또는 FileList
   * @returns 서버에 저장된 파일 정보 목록
   */
  async uploadAsync(
    files: FileList | File[] | File,
  ): Promise<{ path: string; filename: string; size: number }[]> {
    const formData = new FormData();

    if (files instanceof FileList) {
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
    } else if (Array.isArray(files)) {
      for (const file of files) {
        formData.append("files", file);
      }
    } else {
      formData.append("files", files);
    }

    // 서버 URL 구성 (ws:// -> http://)
    const uploadUrl = `${this.serverUrl}/upload`;

    const res = await fetch(uploadUrl, {
      method: "POST",
      body: formData, // Content-Type은 fetch가 자동으로 multipart/form-data로 설정함
    });

    if (!res.ok) {
      throw new Error(`Upload Failed: ${res.statusText}`);
    }

    return await res.json();
  }
}

// T의 모든 메소드 반환형을 Promise로 감싸주는 타입 변환기
export type TRemoteService<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
    : never; // 함수가 아닌 프로퍼티는 안씀
};
