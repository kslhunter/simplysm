# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/service-server` - Fastify 기반 서비스 서버. WebSocket/HTTP 이중 전송, JWT 인증, ORM 브리지, 자동 업데이트를 제공한다. 19개의 TypeScript 소스 파일.

## Architecture

```
src/
├── service-server.ts          ← 진입점: ServiceServer 클래스 (Fastify 래핑)
├── index.ts                   ← public API re-exports
├── types/
│   └── server-options.ts      ← ServiceServerOptions 인터페이스
├── core/
│   ├── define-service.ts      ← defineService, auth, ServiceContext, ServiceMethods
│   └── service-executor.ts    ← 메서드 조회·인증 확인·실행 파이프라인
├── auth/
│   ├── auth-token-payload.ts  ← AuthTokenPayload<TAuthInfo> (JWTPayload 확장)
│   └── jwt-manager.ts         ← signJwt / verifyJwt / decodeJwt (jose 사용)
├── transport/
│   ├── http/
│   │   ├── http-request-handler.ts  ← GET/POST /api/:service/:method 처리
│   │   ├── upload-handler.ts        ← /upload multipart 처리
│   │   └── static-file-handler.ts   ← 정적 파일 서빙
│   └── socket/
│       ├── service-socket.ts        ← 단일 WebSocket 연결 추상화
│       └── websocket-handler.ts     ← 다중 소켓 관리·메시지 라우팅·이벤트 브로드캐스트
├── protocol/
│   └── protocol-wrapper.ts    ← 서버 측 프로토콜 인코딩/디코딩 래퍼
├── services/
│   ├── orm-service.ts            ← ORM 브리지 서비스 (WebSocket 전용, 인증 필수)
│   ├── auto-update-service.ts    ← 자동 업데이트 서비스
│   └── app-structure-service.ts  ← 앱 구조 정보 제공 서비스
├── utils/
│   └── config-manager.ts      ← .config.json 파일 읽기 유틸
├── workers/
│   └── service-protocol.worker.ts  ← 프로토콜 인코딩/디코딩 워커
└── legacy/
    └── v1-auto-update-handler.ts   ← V1 WebSocket 프로토콜 호환 레이어
```

### 요청 흐름

- **WebSocket 요청**: `ServiceServer` → `WebSocketHandler.addSocket` → `ServiceSocket.on("message")` → `executeServiceMethod`
- **HTTP 요청**: `ServiceServer` → `handleHttpRequest` → `executeServiceMethod`
- **공통 실행**: `executeServiceMethod` → 서비스 조회 → 컨텍스트 생성 → 인증 확인 → 메서드 호출

## Key Patterns

### 서비스 정의

`defineService`로 서비스를 정의하고, `ServiceMethods`로 클라이언트 공유 타입을 추출한다.

```typescript
export const UserService = defineService("User", auth((ctx) => ({
  // 서비스 수준 인증: 로그인 필수
  getProfile: () => ctx.authInfo,
  // 메서드 수준 인증: "admin" 역할 필수
  deleteUser: auth(["admin"], (id: number) => { /* ... */ }),
  // 인증 불필요 메서드는 auth 없이 직접 선언
  healthCheck: () => "ok",
})));

// 클라이언트에 타입 공유
export type UserServiceType = ServiceMethods<typeof UserService>;
```

### auth() 래퍼 동작 규칙

| `server.options.auth` | `auth()` 래핑 여부 | 결과 |
|---|---|---|
| `undefined` | O | 에러 (설정 오류) |
| `false` | O | 인증 검사 스킵 (의도적 비활성화) |
| `{ jwtSecret }` | O | 토큰·역할 검사 수행 |

- `auth()` 없이 정의된 메서드는 `server.options.auth` 값과 무관하게 인증 없이 실행된다.
- 역할 배열이 비어 있으면(`auth(() => ...)`) 로그인만 확인하고 역할은 검사하지 않는다.

### ServiceContext

팩토리 함수가 받는 컨텍스트 객체. 전송 방식(WebSocket/HTTP)에 무관하게 동일한 인터페이스를 제공한다.

```typescript
interface ServiceContext<TAuthInfo> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;     // WebSocket 요청일 때만 존재
  http?: { clientName: string; authTokenPayload? };  // HTTP 요청일 때만 존재

  get authInfo(): TAuthInfo | undefined;    // 토큰에서 추출한 사용자 데이터
  get clientName(): string | undefined;     // 클라이언트 앱 이름 (경로 탐색용)
  get clientPath(): string | undefined;     // rootPath/www/{clientName}
  getConfig<T>(section: string): Promise<T>; // .config.json 섹션 읽기
}
```

- `clientName`은 `..`, `/`, `\` 포함 시 에러를 던진다 (경로 탐색 공격 방지).
- `getConfig`는 루트 `.config.json`을 먼저 읽고, 클라이언트별 `.config.json`으로 덮어쓴다.

### ServiceServer 생성 및 실행

```typescript
const server = createServiceServer<MyAuthInfo>({
  rootPath: "/app",
  port: 3000,
  ssl: { pfxBytes: Uint8Array, passphrase: "..." }, // 선택
  auth: { jwtSecret: "secret" },  // false: 인증 비활성화, undefined: auth 없음
  services: [UserService, OrmService, AutoUpdateService],
});

await server.listen();

// 서버에서 특정 클라이언트에 이벤트 발송 (getEvent 프록시 방식)
const myEvt = server.getEvent<typeof MyEvent>("MyEvent");
await myEvt.emit((info) => info.userId === "123", data);

// JWT 토큰 발급/검증
const token = await server.signAuthToken({ roles: ["admin"], data: myAuthInfo });
const payload = await server.verifyAuthToken(token);
```

### 내장 서비스

**OrmService** (`services/orm-service.ts`):

- WebSocket 전용. HTTP 요청 시 에러.
- `auth()`로 래핑 → 로그인 필수.
- 소켓별 `WeakMap<ServiceSocket, Map<number, DbConn>>`으로 연결을 관리.
- 소켓이 닫히면 해당 소켓의 열린 DB 연결을 모두 자동 종료.
- `getConfig("orm")`에서 `configName`으로 DB 연결 설정을 읽는다.

**AutoUpdateService** (`services/auto-update-service.ts`):

- `clientPath/{platform}/updates/` 디렉토리에서 최신 버전 파일(`.apk` 또는 `.exe`)을 찾아 반환.
- `semver`로 최대 버전을 결정.

**AppStructureService** (`services/app-structure-service.ts`):

- 팩토리 함수로 생성. `Record<string, AppStructureItem[]>` 맵을 받아 클라이언트에 앱 구조 정보를 반환한다.
- 인증 불필요. `getItems()` 메서드 하나만 제공한다.

### JWT 토큰

- 알고리즘: HS256, 유효기간: 12시간.
- `AuthTokenPayload<TAuthInfo>` = `{ roles: string[]; data: TAuthInfo } & JWTPayload`

### WebSocket 프로토콜 메시지 라우팅

`websocket-handler.ts`의 `processRequest`가 `message.name`으로 분기한다:

| `message.name` | 처리 |
|---|---|
| `"SvcName.methodName"` | `executeServiceMethod` 호출 |
| `"evt:add"` | 이벤트 리스너 등록 |
| `"evt:remove"` | 이벤트 리스너 제거 |
| `"evt:gets"` | 전체 소켓의 리스너 조회 |
| `"evt:emit"` | 특정 키 대상 이벤트 발송 |
| `"auth"` | JWT 토큰 검증 후 소켓에 저장 |

## Testing

**프레임워크**: Vitest

테스트 파일은 `tests/` 디렉토리에 위치하며, 소스 파일을 직접 import한다.

```
tests/
├── define-service.spec.ts              ← defineService / auth / getServiceAuthPermissions 단위 테스트
├── service-executor.spec.ts            ← executeServiceMethod 인증 파이프라인 통합 테스트
├── orm-service.spec.ts                 ← OrmService.executeDefs 동작 검증 (orm-node 모킹)
├── app-structure-service.spec.ts       ← AppStructureService 단위 테스트
└── app-structure-service.acc.spec.ts   ← AppStructureService 인수 테스트
```

**모킹 패턴**: `vi.mock`으로 `@simplysm/orm-node`를 모킹하고, `createDbConn`이 반환할 Mock 객체를 직접 구성한다. `ServiceServer`는 `{ options: { services, auth } }` 형태의 최소 목 객체(`createMockServer`)로 대체한다.

```typescript
// 모킹 예시 (orm-service.spec.ts)
vi.mock("@simplysm/orm-node", () => ({
  createDbConn: vi.fn(),
}));

const mockConn = {
  config: { dialect: "postgresql" as const },
  connect: vi.fn(),
  execute: vi.fn((queries: string[]) => Promise.resolve(queries.map(() => []))),
  on: vi.fn(),
  // ...
};
vi.mocked(createDbConn).mockResolvedValue(mockConn as any);
```

## 주의사항

- `service-server.ts`에서 Fastify HTTPS 설정 시 `node:buffer`의 `Buffer`를 사용한다. Fastify의 `https` 옵션이 `Buffer` 타입을 요구하기 때문이며, 이 경우에 한해 의도적으로 허용된 예외다.
- `OrmService`의 소켓-연결 상태(`socketConns WeakMap`)는 팩토리 함수 외부(모듈 스코프)에 선언된다. 팩토리는 요청마다 호출되므로, 연결 상태를 팩토리 내부에 두면 호출 간 공유가 불가능하다.
- `legacy/v1-auto-update-handler.ts`는 V1 WebSocket 프로토콜 전용이다. 신규 기능 추가 시 이 파일을 수정하지 않는다.
