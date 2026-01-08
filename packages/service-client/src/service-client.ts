import pino from "pino";
import type { Type } from "@simplysm/core-common";
import type { ServiceEventListener } from "@simplysm/service-common";
import { EventEmitter } from "events";

import type { IServiceConnectionConfig } from "./types/connection-config";
import type { IServiceProgress, IServiceProgressState } from "./types/progress.types";
import { ServiceTransport } from "./transport/service-transport";
import { SocketProvider } from "./transport/socket-provider";
import { EventClient } from "./features/event-client";
import { FileClient } from "./features/file-client";

const logger = pino({ name: "service-client:ServiceClient" });

export class ServiceClient extends EventEmitter {
  // 모듈들
  private readonly _socket: SocketProvider;
  private readonly _transport: ServiceTransport;
  private readonly _eventClient: EventClient;
  private readonly _fileClient: FileClient;

  private _authToken?: string;

  override on(event: "request-progress", listener: (state: IServiceProgressState) => void): this;
  override on(event: "response-progress", listener: (state: IServiceProgressState) => void): this;
  override on(
    event: "state",
    listener: (state: "connected" | "closed" | "reconnecting") => void,
  ): this;
  override on(event: "reload", listener: (changedFileSet: Set<string>) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  // 상태 접근자
  get connected() {
    return this._socket.connected;
  }
  get hostUrl() {
    const hostProtocol = this.options.ssl ? "https" : "http";
    return `${hostProtocol}://${this.options.host}:${this.options.port}`;
  }

  constructor(
    public readonly name: string,
    public readonly options: IServiceConnectionConfig,
  ) {
    super();

    const wsProtocol = options.ssl ? "wss" : "ws";
    const wsUrl = `${wsProtocol}://${options.host}:${options.port}/ws`;

    // 모듈 초기화
    this._socket = new SocketProvider(wsUrl, this.name, this.options.maxReconnectCount ?? 10);
    this._transport = new ServiceTransport(this._socket);
    this._eventClient = new EventClient(this._transport);
    this._fileClient = new FileClient(this.hostUrl, this.name);

    // 이벤트 바인딩
    this._socket.on("state", async (state) => {
      this.emit("state", state);

      // 재연결 시 이벤트 리스너 자동 복구
      if (state === "connected") {
        try {
          if (this._authToken != null) {
            await this.authAsync(this._authToken); // 재인증
          }
          await this._eventClient.reRegisterAllAsync();
        } catch (err) {
          logger.error({ err }, "이벤트 리스너 복구 실패");
        }
      }
    });

    this._transport.on("reload", (changedFiles) => {
      this.emit("reload", changedFiles);
    });
  }

  // 타입 안전성을 위한 Proxy 생성 메소드
  getService<T>(serviceName: string): TRemoteService<T> {
    return new Proxy({} as TRemoteService<T>, {
      get: (_target, prop) => {
        const methodName = String(prop);
        return async (...params: unknown[]) => {
          return await this.sendAsync(serviceName, methodName, params);
        };
      },
    });
  }

  async connectAsync(): Promise<void> {
    await this._socket.connectAsync();
  }

  async closeAsync(): Promise<void> {
    await this._socket.closeAsync();
  }

  async sendAsync(
    serviceName: string,
    methodName: string,
    params: unknown[],
    progress?: IServiceProgress,
  ): Promise<unknown> {
    return await this._transport.sendAsync(
      {
        name: `${serviceName}.${methodName}`,
        body: params,
      },
      {
        request: (state) => {
          this.emit("request-progress", state);
          progress?.request?.(state);
        },
        response: (state) => {
          this.emit("response-progress", state);
          progress?.response?.(state);
        },
      },
    );
  }

  async authAsync(token: string): Promise<void> {
    await this._transport.sendAsync({ name: "auth", body: token });
    this._authToken = token;
  }

  async addEventListenerAsync<T extends ServiceEventListener<unknown, unknown>>(
    eventType: Type<T>,
    info: T["$info"],
    cb: (data: T["$data"]) => PromiseLike<void>,
  ): Promise<string> {
    if (!this.connected) throw new Error("서버와 연결되어있지 않습니다.");
    return await this._eventClient.addListenerAsync(eventType, info, cb);
  }

  async removeEventListenerAsync(key: string): Promise<void> {
    await this._eventClient.removeListenerAsync(key);
  }

  async emitAsync<T extends ServiceEventListener<unknown, unknown>>(
    eventType: Type<T>,
    infoSelector: (item: T["$info"]) => boolean,
    data: T["$data"],
  ): Promise<void> {
    await this._eventClient.emitAsync(eventType, infoSelector, data);
  }

  async uploadFileAsync(files: File[] | FileList | { name: string; data: BlobPart }[]) {
    if (this._authToken == null) {
      throw new Error(
        "인증 토큰이 없습니다. 파일 업로드를 위해서는 먼저 authAsync()를 호출하여 인증해야 합니다.",
      );
    }
    return await this._fileClient.uploadAsync(files, this._authToken);
  }

  async downloadFileBufferAsync(relPath: string) {
    return await this._fileClient.downloadAsync(relPath);
  }
}

// T의 모든 메소드 반환형을 Promise로 감싸주는 타입 변환기
export type TRemoteService<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never; // 함수가 아닌 프로퍼티는 안씀
};
