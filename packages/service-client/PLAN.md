# service-client 마이그레이션 워크플로우

> `sd-service-client` → `service-client` 완전 재구축 계획
>
> **의존성**: `service-common` (완료), `core-common`, `orm-common`

---

## 개요

### 현재 상태

| 항목 | 상태 |
|------|------|
| 레거시 경로 | `.legacy-packages/sd-service-client` |
| 파일 수 | 13개 |
| 코드 라인 | ~600 LOC |

### 마이그레이션 방향

```
레거시 (13 파일)
    ↓ Sd 접두사 제거
    ↓ 케밥케이스 파일명
    ↓ pino 로깅 (console 대체)
    ↓ import 경로 변경
신규 (13 파일)
```

### 의존성 구조

```
service-client
    ├── @simplysm/service-common   (프로토콜, 타입, ServiceEventListener)
    ├── @simplysm/core-common      (Uuid, Wait, LazyGcMap, TransferableConvert)
    ├── @simplysm/orm-common       (타입만: DbContext, IDbContextExecutor 등)
    └── pino                       (로깅)
```

### 브라우저 환경 고려사항

| 항목 | 설명 |
|------|------|
| `EventEmitter` | esbuild 폴리필 (`events`) |
| `Buffer` | esbuild 폴리필 (`buffer`) |
| `pino` | 브라우저 지원 (pino-browser) |
| Web Worker | `import.meta.url` + `new Worker()` |

---

## 외부 의존성

| 패키지 | 용도 | 유지 |
|--------|------|------|
| `pino` | 로깅 | ✅ |
| `ws` | WebSocket (Node.js) | ✅ (선택적) |

> **Note**: 브라우저 환경에서는 네이티브 `WebSocket` API 사용. Node.js 환경에서만 `ws` 사용.

---

## 결정 사항

| 항목 | 결정 | 비고 |
|------|------|------|
| 네이밍 | `Sd` 접두사 제거 | `SdServiceClient` → `ServiceClient` |
| 파일명 | 케밥케이스 | `service-client.ts` |
| 로깅 | `pino` 사용 | `console.log/warn/error` 대체 |
| EventEmitter | 폴리필 사용 | esbuild `events` 폴리필 |
| 타입 | `any` → `unknown` | strict 모드 |
| 하드코딩 상수 | 유지 | 변경할 일 없음 |
| Web Worker | 독립 유지 | `import.meta.resolve` 패턴 |
| OrmService 참조 | `"SdOrmService"` → `"OrmService"` | 서버 서비스명 변경 반영 |

---

## 하드코딩 상수 (유지)

| 위치 | 상수 | 값 | 비고 |
|------|------|-----|------|
| `SocketProvider` | `_HEARTBEAT_TIMEOUT` | 30초 | 하트비트 타임아웃 |
| `SocketProvider` | `_HEARTBEAT_INTERVAL` | 5초 | 핑 주기 |
| `SocketProvider` | `_RECONNECT_DELAY` | 3초 | 재연결 대기 |
| `ClientProtocolWrapper` | `_SIZE_THRESHOLD` | 30KB | 워커 분기 기준 |

---

## Phase 1: 프로젝트 구조 설정 ✅ 완료

### Task 1.1: 패키지 초기화

**파일 생성**:
- [x] `packages/service-client/package.json`
- [x] `packages/service-client/tsconfig.json`
- [x] `packages/service-client/CLAUDE.md`
- [x] `packages/service-client/src/index.ts`

**package.json 구성**:
```json
{
  "name": "@simplysm/service-client",
  "version": "13.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@simplysm/service-common": "workspace:*",
    "@simplysm/core-common": "workspace:*",
    "@simplysm/orm-common": "workspace:*",
    "pino": "^9.6.0"
  },
  "devDependencies": {
    "ws": "^8.18.3",
    "@types/ws": "^8.18.1"
  }
}
```

### Task 1.2: 디렉토리 구조 생성

```
packages/service-client/
├── src/
│   ├── index.ts
│   ├── service-client.ts           # 메인 클라이언트 클래스
│   ├── types/
│   │   ├── connection-config.ts    # IServiceConnectionConfig
│   │   └── progress.types.ts       # IServiceProgress, IServiceProgressState
│   ├── transport/
│   │   ├── socket-provider.ts      # WebSocket 연결 관리
│   │   └── service-transport.ts    # 요청/응답 관리
│   ├── protocol/
│   │   └── client-protocol-wrapper.ts  # 워커 분기 처리
│   ├── features/
│   │   ├── event-client.ts         # 이벤트 리스너 관리
│   │   ├── file-client.ts          # 파일 업/다운로드
│   │   └── orm/
│   │       ├── orm-connect-config.ts           # IOrmConnectConfig
│   │       ├── orm-client-connector.ts         # OrmClientConnector
│   │       └── orm-client-db-context-executor.ts  # OrmClientDbContextExecutor
│   └── workers/
│       └── client-protocol.worker.ts
└── tests/
    └── ... (필요시 추가)
```

---

## Phase 2: 타입 및 인터페이스 마이그레이션 ✅ 완료

### Task 2.1: 연결 설정 타입

**마이그레이션 대상**:

| 레거시 | 신규 | 변경 사항 |
|--------|------|----------|
| `ISdServiceConnectionConfig` | `IServiceConnectionConfig` | ISd 제거 |

**`types/connection-config.ts`**:
```typescript
export interface IServiceConnectionConfig {
  port: number;
  host: string;
  ssl?: boolean;
  /** 0 입력시 reconnect안함. 바로 끊김 */
  maxReconnectCount?: number;
}
```

### Task 2.2: 진행률 타입

**마이그레이션 대상**:

| 레거시 | 신규 | 변경 사항 |
|--------|------|----------|
| `ISdServiceProgress` | `IServiceProgress` | ISd 제거 |
| `ISdServiceProgressState` | `IServiceProgressState` | ISd 제거 |

**`types/progress.types.ts`**:
```typescript
export interface IServiceProgress {
  request?: (s: IServiceProgressState) => void;
  response?: (s: IServiceProgressState) => void;
}

export interface IServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

### Task 2.3: ORM 설정 타입

**마이그레이션 대상**:

| 레거시 | 신규 | 변경 사항 |
|--------|------|----------|
| `ISdOrmServiceConnectConfig` | `IOrmConnectConfig` | ISdOrmService 제거 |

**`features/orm/orm-connect-config.ts`**:
```typescript
import type { Type } from "@simplysm/core-common";
import type { TDbConnOptions } from "@simplysm/service-common";

export interface IOrmConnectConfig<T> {
  dbContextType: Type<T>;
  connOpt: TDbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
```

---

## Phase 3: 전송 계층 마이그레이션 ✅ 완료

### Task 3.1: SocketProvider

**마이그레이션 대상**: `SdSocketProvider` → `SocketProvider`

**주요 변경**:
- `console.log/warn/error` → `pino` 로깅
- 타입: `any` → `unknown`

**`transport/socket-provider.ts`** 핵심 구조:
```typescript
import pino from "pino";
import { Uuid, Wait } from "@simplysm/core-common";
import { EventEmitter } from "events";

const logger = pino({ name: "service-client:SocketProvider" });

export class SocketProvider extends EventEmitter {
  private readonly _HEARTBEAT_TIMEOUT = 30000;
  private readonly _HEARTBEAT_INTERVAL = 5000;
  private readonly _RECONNECT_DELAY = 3000;
  private readonly _PING_PACKET = new Uint8Array([0x01]);

  private _ws?: WebSocket;
  private _isManualClose = false;
  private _reconnectCount = 0;
  private _heartbeatTimer?: ReturnType<typeof setInterval>;
  private _lastHeartbeatTime = Date.now();

  // 이벤트 타입 정의
  override on(event: "message", listener: (data: Buffer) => void): this;
  override on(event: "state", listener: (state: "connected" | "closed" | "reconnecting") => void): this;
  override on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  get connected(): boolean {
    return this._ws?.readyState === WebSocket.OPEN;
  }

  constructor(
    private readonly _url: string,
    public readonly clientName: string,
    private readonly _maxReconnectCount: number,
  ) {
    super();
  }

  // ... 나머지 메소드 동일 (console → logger 변경)
}
```

### Task 3.2: ServiceTransport

**마이그레이션 대상**: `SdServiceTransport` → `ServiceTransport`

**주요 변경**:
- `SdServiceClientProtocolWrapper` → `ClientProtocolWrapper`
- import 경로 변경

**`transport/service-transport.ts`** 핵심 구조:
```typescript
import type {
  IServiceErrorMessage,
  IServiceResponseMessage,
  TServiceClientMessage,
} from "@simplysm/service-common";
import { EventEmitter } from "events";
import { Uuid } from "@simplysm/core-common";
import type { SocketProvider } from "./socket-provider";
import { ClientProtocolWrapper } from "../protocol/client-protocol-wrapper";
import type { IServiceProgress } from "../types/progress.types";

export class ServiceTransport extends EventEmitter {
  private readonly _protocol = new ClientProtocolWrapper();

  private readonly _listenerMap = new Map<
    string,
    {
      resolve: (msg: IServiceResponseMessage) => void;
      reject: (err: Error) => void;
      progress?: IServiceProgress;
    }
  >();

  // 이벤트 타입 정의
  override on(event: "reload", listener: (changedFileSet: Set<string>) => void): this;
  override on(event: "event", listener: (keys: string[], data: unknown) => void): this;
  override on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  // ... 나머지 동일
}
```

---

## Phase 4: 프로토콜 및 워커 마이그레이션 ✅ 완료

### Task 4.1: ClientProtocolWrapper

**마이그레이션 대상**: `SdServiceClientProtocolWrapper` → `ClientProtocolWrapper`

**주요 변경**:
- `SdServiceProtocol` → `ServiceProtocol`
- import 경로 변경

**`protocol/client-protocol-wrapper.ts`**:
```typescript
import type { IServiceMessageDecodeResult, TServiceMessage } from "@simplysm/service-common";
import { ServiceProtocol } from "@simplysm/service-common";
import { LazyGcMap, TransferableConvert, Uuid } from "@simplysm/core-common";

export class ClientProtocolWrapper {
  private readonly _SIZE_THRESHOLD = 30 * 1024; // 30KB
  private readonly _protocol = new ServiceProtocol();

  private static _worker?: Worker;
  private static readonly _workerResolvers = new LazyGcMap<
    string,
    { resolve: (res: unknown) => void; reject: (err: Error) => void }
  >({
    gcInterval: 5 * 1000,
    expireTime: 60 * 1000,
    onExpire: (key, item) => {
      item.reject(new Error(`Worker task timed out (uuid: ${key})`));
    },
  });

  // ... 나머지 동일
}
```

### Task 4.2: Worker

**마이그레이션 대상**: `client-protocol.worker.ts`

**주요 변경**:
- `SdServiceProtocol` → `ServiceProtocol`
- import 경로 변경

**`workers/client-protocol.worker.ts`**:
```typescript
/// <reference lib="webworker" />

import { ServiceProtocol } from "@simplysm/service-common";
import { TransferableConvert } from "@simplysm/core-common";

const protocol = new ServiceProtocol();

self.onmessage = (event: MessageEvent) => {
  const { id, type, data } = event.data;

  try {
    let result: unknown;
    let transferList: Transferable[] = [];

    if (type === "encode") {
      const { uuid, message } = data;
      const { chunks } = protocol.encode(uuid, message);
      result = chunks;
      transferList = chunks.map((chunk: Buffer) => chunk.buffer);
    } else if (type === "decode") {
      const buffer = Buffer.from(data);
      const decodeResult = protocol.decode(buffer);
      const encoded = TransferableConvert.encode(decodeResult);
      result = encoded.result;
      transferList = encoded.transferList;
    }

    self.postMessage({ id, type: "success", result }, { transfer: transferList });
  } catch (err) {
    self.postMessage({
      id,
      type: "error",
      error: err instanceof Error
        ? { message: err.message, stack: err.stack }
        : { message: String(err) },
    });
  }
};
```

---

## Phase 5: 기능 모듈 마이그레이션 ✅ 완료

### Task 5.1: EventClient

**마이그레이션 대상**: `SdServiceEventClient` → `EventClient`

**주요 변경**:
- `SdServiceEventListenerBase` → `ServiceEventListener`
- `console.error` → `pino` 로깅

**`features/event-client.ts`**:
```typescript
import type { Type } from "@simplysm/core-common";
import { Uuid } from "@simplysm/core-common";
import type { ServiceEventListener } from "@simplysm/service-common";
import type { ServiceTransport } from "../transport/service-transport";
import pino from "pino";

const logger = pino({ name: "service-client:EventClient" });

export class EventClient {
  private readonly _listenerMap = new Map<
    string,
    { name: string; info: unknown; cb: (data: unknown) => PromiseLike<void> | void }
  >();

  constructor(private readonly _transport: ServiceTransport) {
    this._transport.on("event", async (keys: string[], data: unknown) => {
      await this._executeByKeyAsync(keys, data);
    });
  }

  async addListenerAsync<T extends ServiceEventListener<unknown, unknown>>(
    eventListenerType: Type<T>,
    info: T["$info"],
    cb: (data: T["$data"]) => PromiseLike<void>,
  ): Promise<string> {
    // ... 동일 (eventListenerType.name 사용)
  }

  // ... 나머지 동일 (console.error → logger.error)
}
```

### Task 5.2: FileClient

**마이그레이션 대상**: `SdServiceFileClient` → `FileClient`

**주요 변경**:
- `ISdServiceUploadResult` → `IServiceUploadResult`

**`features/file-client.ts`**:
```typescript
import type { IServiceUploadResult } from "@simplysm/service-common";

export class FileClient {
  constructor(
    private readonly _hostUrl: string,
    private readonly _clientName: string,
  ) {}

  async downloadAsync(relPath: string): Promise<Buffer> {
    const url = `${this._hostUrl}${relPath.startsWith("/") ? "" : "/"}${relPath}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async uploadAsync(
    files: File[] | FileList | { name: string; data: BlobPart }[],
    authToken: string,
  ): Promise<IServiceUploadResult[]> {
    // ... 동일
  }
}
```

### Task 5.3: ORM 클라이언트

**마이그레이션 대상**:

| 레거시 | 신규 | 변경 사항 |
|--------|------|----------|
| `SdOrmServiceClientConnector` | `OrmClientConnector` | Sd 제거 |
| `SdOrmServiceClientDbContextExecutor` | `OrmClientDbContextExecutor` | Sd 제거, 서비스명 변경 |

**`features/orm/orm-client-db-context-executor.ts`** 주요 변경:
```typescript
import type { IOrmService } from "@simplysm/service-common";
import type { ServiceClient } from "../../service-client";

export class OrmClientDbContextExecutor implements IDbContextExecutor {
  private _connId?: number;
  private readonly _ormService: IOrmService;

  constructor(
    private readonly _client: ServiceClient,
    private readonly _opt: TDbConnOptions & { configName: string },
  ) {
    // "SdOrmService" → "OrmService" 변경
    this._ormService = _client.getService<IOrmService>("OrmService");
  }

  // ... 나머지 동일
}
```

---

## Phase 6: 메인 클라이언트 클래스 마이그레이션 ✅ 완료

### Task 6.1: ServiceClient

**마이그레이션 대상**: `SdServiceClient` → `ServiceClient`

**주요 변경**:
- `SdServiceEventListenerBase` → `ServiceEventListener`
- `console.error` → `pino` 로깅
- 모든 모듈 import 경로 변경

**`service-client.ts`**:
```typescript
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
  private readonly _socket: SocketProvider;
  private readonly _transport: ServiceTransport;
  private readonly _eventClient: EventClient;
  private readonly _fileClient: FileClient;

  private _authToken?: string;

  // 이벤트 타입 정의
  override on(event: "request-progress", listener: (state: IServiceProgressState) => void): this;
  override on(event: "response-progress", listener: (state: IServiceProgressState) => void): this;
  override on(event: "state", listener: (state: "connected" | "closed" | "reconnecting") => void): this;
  override on(event: "reload", listener: (changedFileSet: Set<string>) => void): this;
  override on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

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

    this._socket = new SocketProvider(wsUrl, this.name, this.options.maxReconnectCount ?? 10);
    this._transport = new ServiceTransport(this._socket);
    this._eventClient = new EventClient(this._transport);
    this._fileClient = new FileClient(this.hostUrl, this.name);

    // 이벤트 바인딩
    this._socket.on("state", async (state) => {
      this.emit("state", state);

      if (state === "connected") {
        try {
          if (this._authToken != null) {
            await this.authAsync(this._authToken);
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
      { name: `${serviceName}.${methodName}`, body: params },
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
      throw new Error("인증 토큰이 없습니다. 파일 업로드를 위해서는 먼저 authAsync()를 호출하여 인증해야 합니다.");
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
    : never;
};
```

---

## Phase 7: index.ts 및 내보내기 ✅ 완료

### Task 7.1: 모듈 내보내기 구성

**`src/index.ts`**:
```typescript
// 타입
export * from "./types/connection-config";
export * from "./types/progress.types";

// 전송
export * from "./transport/socket-provider";
export * from "./transport/service-transport";

// 프로토콜
export * from "./protocol/client-protocol-wrapper";

// 기능
export * from "./features/event-client";
export * from "./features/file-client";
export * from "./features/orm/orm-connect-config";
export * from "./features/orm/orm-client-connector";
export * from "./features/orm/orm-client-db-context-executor";

// 메인
export * from "./service-client";
```

---

## 검증 체크리스트

### Phase 완료 시 검증

```bash
# 타입체크
npx tsc --noEmit -p packages/service-client/tsconfig.json 2>&1 | grep "^packages/service-client/"

# ESLint
npx eslint "packages/service-client/**/*.ts"

# Vitest (tests 폴더 존재 시)
npx vitest run packages/service-client
```

### 통합 테스트 항목

- [ ] ServiceClient 생성
- [ ] WebSocket 연결 (`connectAsync`)
- [ ] 자동 재연결 (연결 끊김 → 재연결)
- [ ] 인증 (`authAsync`)
- [ ] 서비스 메소드 호출 (`getService<T>()`)
- [ ] 이벤트 리스너 등록/제거
- [ ] 이벤트 발행
- [ ] 파일 업로드
- [ ] 파일 다운로드
- [ ] ORM 연결 (`OrmClientConnector.connectAsync`)
- [ ] 진행률 이벤트
- [ ] Web Worker 프로토콜 처리

---

## 파일 매핑 요약

| 레거시 파일 | 신규 파일 | 상태 |
|------------|----------|------|
| `SdServiceClient.ts` | `service-client.ts` | 마이그레이션 |
| `types/ISdServiceConnectionConfig.ts` | `types/connection-config.ts` | 마이그레이션 |
| `types/progress.types.ts` | `types/progress.types.ts` | 마이그레이션 |
| `transport/SdSocketProvider.ts` | `transport/socket-provider.ts` | 마이그레이션 |
| `transport/SdServiceTransport.ts` | `transport/service-transport.ts` | 마이그레이션 |
| `protocol/SdServiceClientProtocolWrapper.ts` | `protocol/client-protocol-wrapper.ts` | 마이그레이션 |
| `workers/client-protocol.worker.ts` | `workers/client-protocol.worker.ts` | 마이그레이션 |
| `features/event/SdServiceEventClient.ts` | `features/event-client.ts` | 마이그레이션 |
| `features/file/SdServiceFileClient.ts` | `features/file-client.ts` | 마이그레이션 |
| `features/orm/ISdOrmServiceConnectConfig.ts` | `features/orm/orm-connect-config.ts` | 마이그레이션 |
| `features/orm/SdOrmServiceClientConnector.ts` | `features/orm/orm-client-connector.ts` | 마이그레이션 |
| `features/orm/SdOrmServiceClientDbContextExecutor.ts` | `features/orm/orm-client-db-context-executor.ts` | 마이그레이션 |

---

## service-server 연동 사항

### 서비스명 변경

| 레거시 서비스명 | 신규 서비스명 |
|----------------|--------------|
| `SdOrmService` | `OrmService` |
| `SdCryptoService` | `CryptoService` |
| `SdSmtpClientService` | `SmtpService` |
| `SdAutoUpdateService` | `AutoUpdateService` |

### 서버 타입 공유 (`export type` 패턴)

클라이언트에서 서버 서비스 타입 사용:

```typescript
// client/package.json
{
  "dependencies": {
    "@myapp/server": "workspace:*"  // export type만 있으므로 번들 무영향
  }
}

// client 코드
import type { MyService } from "@myapp/server";

const svc = client.getService<MyService>("MyService");
const result = await svc.getData(); // 타입 추론됨
```

---

## 위험 요소 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| 서비스명 변경 | 기존 클라이언트 호환 불가 | 마이그레이션 가이드 작성 |
| pino 브라우저 지원 | 로그 출력 형식 변경 | pino-browser 동작 확인 |
| Web Worker 번들링 | 번들러별 설정 필요 | esbuild/vite 테스트 |
| EventEmitter 폴리필 | 브라우저 호환성 | esbuild 폴리필 확인 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-08 | 마이그레이션 워크플로우 계획 수립 |
| 2026-01-08 | **결정 사항 확정**: Sd 제거, 케밥케이스, pino 로깅, 서비스명 변경 |
| 2026-01-08 | **Phase 1 완료**: 프로젝트 구조 설정 (package.json, tsconfig.json, CLAUDE.md, index.ts) |
| 2026-01-08 | **Phase 2 완료**: 타입 및 인터페이스 마이그레이션 (IServiceConnectionConfig, IServiceProgress, IOrmConnectConfig) |
| 2026-01-08 | **Phase 3 완료**: 전송 계층 마이그레이션 (SocketProvider, ServiceTransport) |
| 2026-01-08 | **Phase 4 완료**: 프로토콜 및 워커 마이그레이션 (ClientProtocolWrapper, client-protocol.worker.ts) |
| 2026-01-08 | **Phase 5 완료**: 기능 모듈 마이그레이션 (EventClient, FileClient, OrmClientConnector, OrmClientDbContextExecutor) |
| 2026-01-08 | **Phase 6 완료**: 메인 클라이언트 클래스 마이그레이션 (ServiceClient, TRemoteService) |
| 2026-01-08 | **Phase 7 완료**: index.ts 모듈 내보내기 구성 |
| 2026-01-08 | **마이그레이션 완료**: service-client 패키지 마이그레이션 완료 |
