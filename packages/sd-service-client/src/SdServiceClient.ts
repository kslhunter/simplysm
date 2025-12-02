/* eslint-disable no-console */

import { ISdServiceConnectionConfig } from "./types/ISdServiceConnectionConfig";
import { Type, Uuid, Wait } from "@simplysm/sd-core-common";
import {
  ISdServiceUploadResult,
  SdServiceEventListenerBase,
  SdServiceProtocolV2,
  TSdServiceServerRawMessage,
} from "@simplysm/sd-service-common";
import { SdWebSocketWrapper } from "./internal/SdWebSocketWrapper";
import { EventEmitter } from "events";
import { SdServiceEventBus } from "./internal/SdServiceEventBus";
import { SdServiceTransport } from "./internal/SdServiceTransport";
import { ISdServiceProgressState } from "./types/progress.types";

export class SdServiceClient extends EventEmitter {
  // 하트비트
  #HEARTBEAT_TIMEOUT = 30000; // 30초간 아무런 메시지가 없으면 끊김으로 간주
  #HEARTBEAT_INTERVAL = 5000; // 5초마다 핑 전송
  #heartbeatInterval?: NodeJS.Timeout;
  #lastHeartbeatTime = Date.now();

  // 재연결
  #RECONNECT_DELAY = 3000; // 3초마다 재연결 시도
  #RECONNECT_MAX_COUNT = 10; // 10번까지만 시도 후 오류

  isManualClose = false;
  isConnected = false;
  websocketUrl: string;
  serverUrl: string;
  reconnectCount = 0;
  #ws: SdWebSocketWrapper;

  #transport: SdServiceTransport;
  #eventBus: SdServiceEventBus;

  #protocol = new SdServiceProtocolV2();

  override on(event: "request-progress", listener: (state: ISdServiceProgressState) => void): this;
  override on(event: "response-progress", listener: (state: ISdServiceProgressState) => void): this;
  override on(
    event: "state-change",
    listener: (state: "connected" | "closed" | "reconnect") => void,
  ): this;
  override on(event: "reload", listener: (changedFileSet: Set<string>) => void): this; // 추가됨
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

    this.#ws = new SdWebSocketWrapper(this.websocketUrl, this.name);
    this.#transport = new SdServiceTransport(this.#ws);
    this.#eventBus = new SdServiceEventBus(this.#transport);
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

  async connectAsync(): Promise<void> {
    if (this.isConnected) return;

    await new Promise<void>(async (resolve, reject) => {
      this.#ws.on("message", async (buf) => {
        // 1. 하트비트 갱신
        this.#lastHeartbeatTime = Date.now();

        const decoded = this.#protocol.decode<TSdServiceServerRawMessage>(buf);
        if (decoded.type === "complete") {
          await this.#handleServerMessageAsync(decoded.message);
          if (decoded.message.name === "connected") {
            resolve();
          }
        }
      });

      this.#ws.on("close", async () => {
        await this.#handleSocketCloseAsync();
      });

      try {
        await this.#ws.connectAsync();
        this.#startHeartbeat(); // 연결 성공 시 하트비트 시작
      } catch (err) {
        console.error("WebSocket 최초 연결 실패", err);
        reject(err);
      }
    });
  }

  async #reconnectAsync(): Promise<void> {
    // 재연결 사용 안 할 때
    if (this.options.disableReconnect) {
      console.error("WebSocket 연결이 끊겼습니다. 연결상태를 확인하세요.");
      return;
    }

    // 여러번 시도시, 재 연결 시도 안함
    if (this.reconnectCount > this.#RECONNECT_MAX_COUNT) {
      console.error("연결이 너무 오래 끊겨있습니다. 연결상태 확인 후, 화면을 새로고침하세요.");
      return;
    }

    // 지연 시간 계산 후 대기
    this.reconnectCount++;
    await Wait.time(this.#RECONNECT_DELAY);

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

  async closeAsync(): Promise<void> {
    this.isManualClose = true;
    await this.#ws.closeAsync();
  }

  async sendAsync(serviceName: string, methodName: string, params: any[]): Promise<any> {
    return await this.#transport.sendAsync(
      Uuid.new().toString(),
      {
        name: `${serviceName}.${methodName}`,
        body: params,
      },
      {
        request: (state) => this.emit("request-progress", state),
        response: (state) => this.emit("response-progress", state),
      },
    );
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
    }[] = await this.#transport.sendAsync(Uuid.new().toString(), {
      name: "evt:gets",
      body: { name: eventType.name },
    });
    const targetListenerKeys = listenerInfos
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    await this.#transport.sendAsync(Uuid.new().toString(), {
      name: "evt:emit",
      body: {
        keys: targetListenerKeys,
        data,
      },
    });
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

  async uploadFileAsync(
    files: File[] | FileList | { name: string; data: Blob | Buffer }[],
  ): Promise<ISdServiceUploadResult[]> {
    const formData = new FormData();

    // 입력값 정규화 (배열로 변환)
    const fileList = files instanceof FileList ? Array.from(files) : files;

    for (const file of fileList) {
      if (file instanceof File) {
        // 브라우저 File 객체
        // encodeURIComponent로 파일명 한글 깨짐 방지 (서버/클라이언트 환경에 따라 필요할 수 있음)
        formData.append("files", file, file.name);
      } else {
        // 커스텀 객체 ({ name, data })
        const blob = file.data instanceof Blob ? file.data : new Blob([file.data]); // Buffer인 경우 Blob으로 변환
        formData.append("files", blob, file.name);
      }
    }

    // 서버 업로드 엔드포인트 호출
    const res = await fetch(`${this.serverUrl}/upload`, {
      method: "POST",
      body: formData,
      // fetch가 FormData를 감지하면 Content-Type: multipart/form-data; boundary=... 를 자동으로 설정함
      // 수동으로 Content-Type 헤더를 넣으면 boundary가 빠져서 에러 남!
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
    }

    // 서버가 주는 [{ path, filename, size }] 응답 반환
    return await res.json();
  }

  async #handleServerMessageAsync(msg: TSdServiceServerRawMessage): Promise<void> {
    // 서버에서 이벤트가 날아온 경우 → EventBus 통해 콜백 실행
    if (msg.name === "evt:on") {
      await this.#eventBus.handleEventByKeysAsync(msg.body.keys, msg.body.data);
    }
    // 리로드
    else if (
      typeof location !== "undefined" &&
      msg.name === "reload" &&
      this.name === msg.body.clientName
    ) {
      console.log("클라이언트 RELOAD 명령 수신", msg.body.changedFileSet);
      this.emit("reload", msg.body.changedFileSet); // 이벤트를 발생시켜 외부에서 처리하도록 위임
    }
    // 서버 재 연결시, 리스너 재등록
    else if (msg.name === "connected") {
      this.emit("state-change", "success");
      this.isConnected = true;

      await this.#eventBus.reRegisterAllAsync();
    }
  }

  #startHeartbeat() {
    this.#stopHeartbeat();
    this.#lastHeartbeatTime = Date.now();

    this.#heartbeatInterval = setInterval(async () => {
      const now = Date.now();

      // 1. 타임아웃 체크 (서버가 응답이 없는 경우)
      if (now - this.#lastHeartbeatTime > this.#HEARTBEAT_TIMEOUT) {
        console.warn(`Heartbeat Timeout (${this.#HEARTBEAT_TIMEOUT}ms). Force close.`);
        await this.#ws.closeAsync(); // 강제 종료 -> #handleSocketCloseAsync 호출됨 -> 재연결
        return;
      }

      // 2. Ping 전송
      try {
        await this.#transport.sendAsync(Uuid.new().toString(), { name: "ping" });
      } catch {}
    }, this.#HEARTBEAT_INTERVAL);
  }

  #stopHeartbeat() {
    if (this.#heartbeatInterval) {
      clearInterval(this.#heartbeatInterval);
      this.#heartbeatInterval = undefined;
    }
  }

  async #handleSocketCloseAsync(): Promise<void> {
    this.isConnected = false;
    this.#stopHeartbeat(); // 연결 끊김 시 하트비트 중지

    if (this.isManualClose) {
      this.emit("state-change", "closed");
      console.warn("WebSocket 연결 끊김");
      this.isManualClose = false;
    } else {
      this.emit("state-change", "reconnect");
      console.warn("WebSocket 연결 끊김 (재연결 시도)");
      await this.#reconnectAsync();
    }
  }
}

// T의 모든 메소드 반환형을 Promise로 감싸주는 타입 변환기
export type TRemoteService<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
    : never; // 함수가 아닌 프로퍼티는 안씀
};
