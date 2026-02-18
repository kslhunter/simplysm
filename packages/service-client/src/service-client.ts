import consola from "consola";
import { EventEmitter } from "@simplysm/core-common";
import type { ServiceEventDef } from "@simplysm/service-common";
import { createServiceProtocol } from "@simplysm/service-common";

import type { ServiceConnectionConfig } from "./types/connection-config";
import type { ServiceProgress, ServiceProgressState } from "./types/progress.types";
import { createServiceTransport, type ServiceTransport } from "./transport/service-transport";
import { createSocketProvider, type SocketProvider } from "./transport/socket-provider";
import { createEventClient, type EventClient } from "./features/event-client";
import { createFileClient, type FileClient } from "./features/file-client";
import { createClientProtocolWrapper } from "./protocol/client-protocol-wrapper";

const logger = consola.withTag("service-client:ServiceClient");

interface ServiceClientEvents {
  "request-progress": ServiceProgressState;
  "response-progress": ServiceProgressState;
  "state": "connected" | "closed" | "reconnecting";
  "reload": Set<string>;
}

export class ServiceClient extends EventEmitter<ServiceClientEvents> {
  // 모듈들
  private readonly _socket: SocketProvider;
  private readonly _transport: ServiceTransport;
  private readonly _eventClient: EventClient;
  private readonly _fileClient: FileClient;

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
    public readonly options: ServiceConnectionConfig,
  ) {
    super();

    const wsProtocol = options.ssl ? "wss" : "ws";
    const wsUrl = `${wsProtocol}://${options.host}:${options.port}/ws`;

    // 모듈 초기화
    this._socket = createSocketProvider(wsUrl, this.name, this.options.maxReconnectCount ?? 10);
    const protocol = createServiceProtocol();
    const protocolWrapper = createClientProtocolWrapper(protocol);
    this._transport = createServiceTransport(this._socket, protocolWrapper);
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
          await this._eventClient.reRegisterAll();
        } catch (err) {
          logger.error("이벤트 리스너 복구 실패", err);
        }
      }
    });

    this._transport.on("reload", (changedFiles) => {
      this.emit("reload", changedFiles);
    });
  }

  // 타입 안전성을 위한 Proxy 생성 메소드
  getService<TService>(serviceName: string): RemoteService<TService> {
    return new Proxy({} as RemoteService<TService>, {
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
      },
    );
  }

  async auth(token: string): Promise<void> {
    await this._transport.send({ name: "auth", body: token });
    this._authToken = token;
  }

  async addEventListener<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    info: TInfo,
    cb: (data: TData) => PromiseLike<void>,
  ): Promise<string> {
    if (!this.connected) throw new Error("서버와 연결되어있지 않습니다.");
    return this._eventClient.addListener(eventDef, info, cb);
  }

  async removeEventListener(key: string): Promise<void> {
    await this._eventClient.removeListener(key);
  }

  async emitToServer<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void> {
    await this._eventClient.emitToServer(eventDef, infoSelector, data);
  }

  async uploadFile(files: File[] | FileList | { name: string; data: BlobPart }[]) {
    if (this._authToken == null) {
      throw new Error(
        "인증 토큰이 없습니다. 파일 업로드를 위해서는 먼저 auth()를 호출하여 인증해야 합니다.",
      );
    }
    return this._fileClient.upload(files, this._authToken);
  }

  async downloadFileBuffer(relPath: string) {
    return this._fileClient.download(relPath);
  }
}

// TService의 모든 메소드 반환형을 Promise로 감싸주는 타입 변환기
export type RemoteService<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never; // 함수가 아닌 프로퍼티는 안씀
};

export function createServiceClient(name: string, options: ServiceConnectionConfig): ServiceClient {
  return new ServiceClient(name, options);
}
