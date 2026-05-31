import { createLogger } from "@simplysm/core-common";
import { EventEmitter } from "@simplysm/core-common";
import type { ServiceEventDef } from "@simplysm/service-common";
import { createServiceProtocol } from "@simplysm/service-common";

import type { BlobInput, FileCollection } from "./types/browser-compat";
import type { ServiceConnectionOptions } from "./types/connection-options";
import type { ServiceProgress, ServiceProgressState } from "./types/progress.types";
import { createServiceTransport, type ServiceTransport } from "./transport/service-transport";
import { createSocketProvider, type SocketProvider } from "./transport/socket-provider";
import { createEventClient, type ClientEventProxy, type EventClient } from "./features/event-client";
import { createFileClient, type FileClient } from "./features/file-client";
import { createClientProtocolWrapper, type ClientProtocolWrapper } from "./protocol/client-protocol-wrapper";

const logger = createLogger("service-client:ServiceClient");

interface ServiceClientEvents {
  "request-progress": ServiceProgressState;
  "response-progress": ServiceProgressState;
  "server-progress": ServiceProgressState;
  "state": "connected" | "closed" | "reconnecting";
}

export class ServiceClient extends EventEmitter<ServiceClientEvents> {
  // 모듈
  private readonly _socket: SocketProvider;
  private readonly _transport: ServiceTransport;
  private readonly _eventClient: EventClient;
  private readonly _fileClient: FileClient;

  private readonly _protocolWrapper: ClientProtocolWrapper;
  private _authToken?: string;

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
    public readonly options: ServiceConnectionOptions,
  ) {
    super();

    const wsProtocol = options.ssl ? "wss" : "ws";
    const wsUrl = `${wsProtocol}://${options.host}:${options.port}/ws`;

    // 모듈 초기화
    this._socket = createSocketProvider(wsUrl, this.name, this.options.maxReconnectCount ?? 10);
    const protocol = createServiceProtocol();
    this._protocolWrapper = createClientProtocolWrapper(protocol);
    this._transport = createServiceTransport(this._socket, this._protocolWrapper);
    this._eventClient = createEventClient(this._transport);
    this._fileClient = createFileClient(this.hostUrl, this.name);

    // 이벤트 바인딩
    this._socket.on("state", async (state) => {
      this.emit("state", state);

      // 재연결 시 이벤트 리스너 자동 복구
      if (state === "connected") {
        try {
          if (this._authToken != null) {
            await this.auth(this._authToken); // 재인증
          }
          await this._eventClient.resubscribeAll();
        } catch (err) {
          logger.error("이벤트 리스너 복구 실패", err);
        }
      }
    });

  }

  // 타입 안전성을 위한 프록시 생성 메서드
  getService<TService>(serviceName: string): ServiceProxy<TService> {
    return new Proxy({} as ServiceProxy<TService>, {
      get: (_target, prop) => {
        const methodName = String(prop);
        return async (...params: unknown[]) => {
          return this.send(serviceName, methodName, params);
        };
      },
    });
  }

  async connect(): Promise<void> {
    await this._socket.connect();
  }

  async close(): Promise<void> {
    await this._socket.close();
    this._protocolWrapper.dispose();
  }

  async send(
    serviceName: string,
    methodName: string,
    params: unknown[],
    progress?: ServiceProgress,
  ): Promise<unknown> {
    return this._transport.send(
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
        server: (state) => {
          this.emit("server-progress", state);
          progress?.server?.(state);
        },
      },
    );
  }

  async auth(token: string): Promise<void> {
    await this._transport.send({ name: "auth", body: token });
    this._authToken = token;
  }

  getEvent<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
  ): ClientEventProxy<TEventDef> {
    return this._eventClient.getEvent<TEventDef>(eventDef);
  }

  async addListener<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
    info: TEventDef["$info"],
    cb: (data: TEventDef["$data"]) => PromiseLike<void>,
  ): Promise<string> {
    if (!this.connected) throw new Error("서버에 연결되지 않았습니다.");
    return this._eventClient.addListener<TEventDef>(eventDef, info, cb);
  }

  async removeListener(key: string): Promise<void> {
    await this._eventClient.removeListener(key);
  }

  async emitEvent<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void> {
    await this._eventClient.emit<TEventDef>(eventDef, infoSelector, data);
  }

  async uploadFile(files: File[] | FileCollection | { name: string; data: BlobInput }[]) {
    if (this._authToken == null) {
      throw new Error(
        "인증 토큰이 없습니다. 파일 업로드 전에 auth()를 호출하여 인증해 주세요.",
      );
    }
    return this._fileClient.upload(files, this._authToken);
  }

  async downloadFileBuffer(relPath: string) {
    return this._fileClient.download(relPath);
  }
}

// TService의 모든 메서드 반환 타입을 Promise로 래핑하는 타입 변환기
export type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never; // 함수가 아닌 속성은 제외
};

export function createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient {
  return new ServiceClient(name, options);
}
