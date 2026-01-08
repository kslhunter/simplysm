# SERVICE 패키지 통합 마이그레이션 계획

> `sd-service-common`, `sd-service-client`, `sd-service-server` → `service-common`, `service-client`, `service-server`

---

## 개요

### 현재 상태

| 패키지 | 상태 | 비고 |
|--------|------|------|
| `service-common` | ✅ 완료 | 프로토콜 정의, 타입, 서비스 인터페이스 |
| `service-client` | 📋 대기 | 클라이언트 WebSocket 통신, 서비스 호출 |
| `service-server` | 📋 대기 | 서버, 핸들러, 인증, 빌트인 서비스 |

### 마이그레이션 대상

| 레거시 패키지 | 신규 패키지 | 파일 수 | 핵심 역할 |
|--------------|------------|--------|----------|
| `sd-service-common` | `service-common` | 10 → 8 | 프로토콜 정의, 타입, 서비스 인터페이스 |
| `sd-service-client` | `service-client` | 14 | 클라이언트 WebSocket 통신, 서비스 호출 |
| `sd-service-server` | `service-server` | 26 | 서버, 핸들러, 인증, 빌트인 서비스 |

### 의존성 구조

```
service-client
    ↓
service-common ← service-server
    ↓               ↓
orm-common      orm-node
    ↓               ↓
core-common     core-node
```

---

## 아키텍처 분석

### 1. 통신 프로토콜

#### 메시지 구조 (Binary Protocol V2)

```
┌──────────────────────────────────────────────────────────┐
│                    Header (28 bytes)                      │
├──────────────────────────────────────────────────────────┤
│ UUID (16 bytes) │ Total Size (8 bytes) │ Index (4 bytes) │
├──────────────────────────────────────────────────────────┤
│                    Body (JSON)                            │
└──────────────────────────────────────────────────────────┘
```

**특성**:
- 자동 청킹: 3MB 초과 시 300KB 단위 분할
- 최대 메시지: 100MB
- 중복 패킷 방어: 인덱스 기반 추적
- GC: LazyGcMap (10초 간격, 60초 만료)

#### 메시지 타입

| 방향 | 메시지 | 용도 |
|------|--------|------|
| Client → Server | `auth` | JWT 토큰 인증 |
| Client → Server | `${service}.${method}` | 서비스 메소드 호출 |
| Client → Server | `evt:add/remove/gets/emit` | 이벤트 리스너 관리 |
| Server → Client | `response` | 메소드 응답 |
| Server → Client | `error` | 에러 알림 |
| Server → Client | `reload` | 클라이언트 리로드 명령 |
| Server → Client | `progress` | 전송 진행률 |
| Server → Client | `evt:on` | 이벤트 발생 알림 |

### 2. 클라이언트 아키텍처

```
SdServiceClient
    ├── SdSocketProvider         # WebSocket 연결 관리, 자동 재연결
    ├── SdServiceTransport       # 요청/응답 상관, 메시지 시퀀싱
    ├── SdServiceEventClient     # 이벤트 리스너 관리
    └── SdServiceFileClient      # HTTP 파일 업/다운로드
```

**핵심 기능**:
- `getService<T>()`: Proxy 기반 타입 안전 서비스 호출
- 자동 재연결: 10회 시도, 3초 간격
- 하트비트: 5초 간격 Ping, 30초 타임아웃
- 이벤트 복구: 재연결 시 리스너 자동 재등록

### 3. 서버 아키텍처

```
SdServiceServer (Fastify 기반)
    ├── SdServiceExecutor        # 서비스 실행, 권한 검사
    ├── SdServiceJwtManager      # JWT 토큰 관리
    ├── WebSocket Handlers
    │   ├── SdWebSocketHandler   # V2 WebSocket
    │   └── SdWebSocketHandlerV1 # V1 레거시 (deprecated)
    ├── HTTP Handlers
    │   ├── SdHttpRequestHandler # /api/:service/:method
    │   ├── SdUploadHandler      # /upload
    │   └── SdStaticFileHandler  # 정적 파일
    └── Built-in Services
        ├── SdOrmService         # DB 연결/쿼리
        ├── SdCryptoService      # 암호화
        ├── SdSmtpClientService  # 이메일
        └── SdAutoUpdateService  # 자동 업데이트
```

### 4. 인증/인가

**JWT 구조**:
```typescript
interface IAuthTokenPayload<TAuthInfo> {
  perms: string[];      // 권한 코드 목록
  data: TAuthInfo;      // 사용자 정보
  iat: number;          // 발급 시간
  exp: number;          // 만료 시간 (12시간)
}
```

**권한 검사 플로우**:
1. `@Authorize(['perm1', 'perm2'])` 데코레이터로 메소드/클래스 권한 지정
2. 빈 배열 `@Authorize()`: 로그인만 확인
3. V1 클라이언트: 권한 필요 서비스 접근 불가

---

## 외부 의존성

### service-common

| 패키지 | 용도 |
|--------|------|
| `@simplysm/core-common` | JsonConvert, Uuid, LazyGcMap |
| `@simplysm/orm-common` | 타입 정의만 사용 |

### service-client

| 패키지 | 용도 | 유지 |
|--------|------|------|
| `ws` | WebSocket 클라이언트 (Node.js) | ✅ |

### service-server

| 패키지 | 용도 | 유지 |
|--------|------|------|
| `fastify` | HTTP 서버 | ✅ |
| `@fastify/cors` | CORS | ✅ |
| `@fastify/helmet` | 보안 헤더 | ✅ |
| `@fastify/middie` | 미들웨어 | ✅ |
| `@fastify/multipart` | 파일 업로드 | ✅ |
| `@fastify/reply-from` | 프록시 | ✅ |
| `@fastify/static` | 정적 파일 | ✅ |
| `@fastify/websocket` | WebSocket | ✅ |
| `jose` | JWT (ES Module) | ✅ |
| `ws` | WebSocket | ✅ |
| `nodemailer` | 이메일 | ✅ |
| `semver` | 버전 비교 | ✅ |
| `mime` | MIME 타입 | ✅ |
| `bufferutil`, `utf-8-validate` | WS 성능 | ✅ |

---

## 결정 사항

| 항목 | 결정 | 비고 |
|------|------|------|
| 네이밍 | `Sd` 접두사 제거 | `SdServiceClient` → `ServiceClient` |
| 상수 | 하드코딩 유지 | 변경할 일 없음 |
| 로깅 | `pino` 사용 | 브라우저/Node.js 모두 지원 |
| 설정 외부화 | ❌ 안함 | |
| 타입 안전 이벤트 | ✅ 적용 | 제네릭 기반 |
| 빌트인 서비스 | 모두 유지 | 클라이언트의 config 직접 접근 방지 |
| Web Worker | 독립 유지 | 브라우저용, core-node 연동 불필요 |
| EventEmitter | 폴리필 사용 | esbuild 폴리필로 브라우저 지원 |
| EventListenerBase | 인터페이스로 변경 | 클래스 → 인터페이스 |
| API 엔드포인트 | 유지 | `/api/:service/:method`, `/upload`, `/ws` |
| 파일명 | 케밥케이스 | `service-client.ts` |
| **서비스 타입 공유** | `export type` 패턴 | 아래 상세 참조 |

---

## 서비스 타입 공유 전략

### 배경

기존 방식에서 사용자가 서비스를 만들 때 해야 할 작업:
1. `common`에 인터페이스 정의 (`IMyService`)
2. `server`에 구현체 작성 (`MyService implements IMyService`)
3. `client`에서 인터페이스 import + 서비스명 문자열 전달

**문제점**: 보일러플레이트가 많고, common/server/client 세 곳에 작업 필요

### 결정: `export type` 패턴

**서버에서 타입만 export하고, 클라이언트는 `import type`으로 사용**

#### 서버 (server/src/index.ts)

```typescript
// 타입만 export (런타임 값 없음)
export type { MyService } from "./services/my-service";
export type { UserService } from "./services/user-service";

// 서버 실행은 별도 진입점 (main.ts)
```

#### 클라이언트 (client/package.json)

```json
{
  "dependencies": {
    "@myapp/server": "workspace:*"
  }
}
```

> **Note**: `devDependencies`가 아닌 `dependencies`에 추가.
> `import/no-extraneous-dependencies` ESLint 규칙 통과를 위함.
> `export type`만 있으므로 번들에 포함되지 않음.

#### 클라이언트 사용

```typescript
import type { MyService } from '@myapp/server';

const svc = client.getService<MyService>("MyService");
const users = await svc.getUsers({ status: "active" }); // 타입 추론됨
```

### 장점

| Before | After |
|--------|-------|
| common에 인터페이스 정의 필요 | ❌ 불필요 |
| 서버에서 implements | 클래스만 작성 |
| 세 곳(common/server/client) 수정 | 서버만 수정 |

### 프로젝트 구조 예시

```
my-project/
├── client-admin/
│   └── package.json     # deps: "@myapp/server"
├── client-pda/
│   └── package.json     # deps: "@myapp/server"
├── client-common/
│   └── package.json     # deps: "@myapp/server"
├── server/
│   └── src/
│       ├── services/
│       │   └── my-service.ts   # 구현
│       ├── index.ts            # export type { ... }
│       └── main.ts             # 서버 실행
└── common/                     # DTO, Entity만 (서비스 인터페이스 ❌)
```

### 작동 원리

1. `export type { MyService }` → **타입만 export** (런타임 값 없음)
2. 클라이언트에서 `import type` 사용 강제됨
3. 번들러가 `import type`을 완전히 제거 → **번들 크기 무영향**
4. 서버 코드(Node.js 의존성)가 클라이언트 번들에 포함되지 않음

### 빌트인 서비스

`service-common`의 빌트인 서비스 인터페이스(`IOrmService`, `ICryptoService` 등)는 유지.
→ 프레임워크 레벨이므로 common에 정의하는 것이 적절함.

사용자 정의 서비스만 위 패턴 적용.

---

## 마이그레이션 전략

### Phase 1: service-common (기반) ✅ 완료

#### 1.1 프로토콜 정리 ✅

**마이그레이션 결과**:
```
protocol/
├── service-protocol.ts     # 인코딩/디코딩 (ServiceProtocol)
└── protocol.types.ts       # 메시지 타입
```

- [x] `SdServiceProtocol` → `ServiceProtocol`
- [x] 타입 정의 명확화
- [x] 상수는 하드코딩 유지

#### 1.2 서비스 타입 정리 ✅

**마이그레이션 결과**:
```
service-types/
├── orm-service.types.ts          # IOrmService
├── crypto-service.types.ts       # ICryptoService
├── auto-update-service.types.ts  # IAutoUpdateService
└── smtp-service.types.ts         # ISmtpService
```

- [x] 인터페이스 명 표준화: `ISdOrmService` → `IOrmService`
- [x] `@simplysm/sd-orm-common` → `@simplysm/orm-common`

#### 1.3 공통 타입 ✅

**마이그레이션 결과**: `types.ts`

- [x] `SdServiceEventListenerBase` → `ServiceEventListener` (abstract class)
- [x] `eventName` abstract readonly로 변경 (mangle-safe)
- [x] `$info`, `$data` declare 프로퍼티로 변경 (상속 시 재선언 불필요)
- [x] `IServiceUploadResult` 타입 유지

---

### Phase 2: service-server (서버)

> **순서 변경 이유**: 서버가 인터페이스 구현체를 제공하고, 클라이언트 없이 HTTP로 독립 테스트 가능

#### 2.1 핵심 클래스

| 레거시 | 신규 | 변경 사항 |
|--------|------|----------|
| `SdServiceServer` | `ServiceServer` | sd- 제거 |
| `SdServiceExecutor` | `ServiceExecutor` | sd- 제거 |
| `SdServiceBase` | `ServiceBase` | sd- 제거 |

#### 2.2 인증 모듈

| 레거시 | 신규 | 변경 사항 |
|--------|------|----------|
| `SdServiceJwtManager` | `JwtManager` | sd- 제거 |
| `@Authorize` | `@Authorize` | 유지 |
| `IAuthTokenPayload` | `IAuthTokenPayload` | 유지 |

#### 2.3 전송 계층

**WebSocket**:
| 레거시 | 신규 | 비고 |
|--------|------|------|
| `SdWebSocketHandler` | `WebSocketHandler` | V2 |
| `SdServiceSocket` | `ServiceSocket` | V2 |
| `SdWebSocketHandlerV1` | ❌ 제거 | 레거시 |
| `SdServiceSocketV1` | ❌ 제거 | 레거시 |

**HTTP**:
| 레거시 | 신규 |
|--------|------|
| `SdHttpRequestHandler` | `HttpRequestHandler` |
| `SdUploadHandler` | `UploadHandler` |
| `SdStaticFileHandler` | `StaticFileHandler` |

#### 2.4 빌트인 서비스

| 레거시 | 신규 | 변경 사항 |
|--------|------|----------|
| `SdOrmService` | `OrmService` | V1 소켓 지원 제거 |
| `SdCryptoService` | `CryptoService` | sd- 제거 |
| `SdSmtpClientService` | `SmtpService` | 단순화 |
| `SdAutoUpdateService` | `AutoUpdateService` | sd- 제거 |

#### 2.5 유틸리티

| 레거시 | 신규 | 변경 사항 |
|--------|------|----------|
| `SdConfigManager` | `ConfigManager` | sd- 제거 |

---

### Phase 3: service-client (클라이언트)

#### 3.1 핵심 클래스

| 레거시 | 신규 |
|--------|------|
| `SdServiceClient` | `ServiceClient` |
| `SdServiceTransport` | `ServiceTransport` |
| `SdSocketProvider` | `SocketProvider` |

#### 3.2 기능 모듈

| 레거시 | 신규 |
|--------|------|
| `SdServiceEventClient` | `ServiceEventClient` |
| `SdServiceFileClient` | `ServiceFileClient` |
| `SdOrmServiceClientConnector` | `OrmClientConnector` |
| `SdOrmServiceClientDbContextExecutor` | `OrmClientDbContextExecutor` |

#### 3.3 Web Worker

**현재**: `workers/client-protocol.worker.ts`

**마이그레이션**:
- [ ] 워커 로직 유지 (프로토콜 인코딩)
- [ ] 독립 유지 (브라우저용, core-node Worker 유틸 연동 불필요)

#### 3.4 개선 사항

- [ ] `EventEmitter` → 타입 안전 이벤트 (제네릭)
- [ ] `console.log/warn` → `pino` 로깅

---

### Phase 4: V1 레거시 → 미들웨어로 대체

#### 배경

- V1 클라이언트: 구버전 앱에 탑재된 `sd-service-client` (V1 프로토콜)
- 구버전 앱이 V2 서버에 연결 시 `SdAutoUpdateService.getLastVersion()` 호출 필요
- 버전 정보 받아서 APK 다운로드 → V2 앱으로 업데이트
- **V1 완전 제거 시 구버전 앱이 업데이트 불가** (사용자가 수동 재설치해야 함)

#### 제거 대상 (6개 파일 → 1개로 통합)

```
legacy/                              →  legacy/
├── command-v1.types.ts       ❌        └── v1-auto-update-handler.ts  ✅
├── protocol-v1.types.ts      ❌
├── SdServiceCommandHelperV1.ts  ❌
├── SdServiceProtocolV1.ts    ❌
├── SdServiceSocketV1.ts      ❌
└── SdWebSocketHandlerV1.ts   ❌
```

#### 미들웨어 구현 (~50 LOC)

```typescript
// legacy/v1-auto-update-handler.ts
export function handleV1Connection(
  socket: WebSocket,
  autoUpdateService: AutoUpdateService
) {
  socket.on("message", async (data) => {
    const msg = JSON.parse(data.toString());

    // SdAutoUpdateService.getLastVersion만 허용
    if (msg.name === "request" &&
        msg.command === "SdAutoUpdateService.getLastVersion") {
      const result = await autoUpdateService.getLastVersion(msg.params[0]);
      socket.send(JSON.stringify({
        name: "response",
        reqUuid: msg.uuid,
        state: "success",
        body: result,
      }));
    } else {
      // 다른 모든 요청은 업그레이드 유도
      socket.send(JSON.stringify({
        name: "response",
        reqUuid: msg.uuid,
        state: "error",
        body: {
          message: "앱 업데이트가 필요합니다.",
          code: "UPGRADE_REQUIRED"
        }
      }));
    }
  });
}
```

#### 비교

| 항목 | 현재 V1 (6개 파일) | 미들웨어 (1개 파일) |
|------|-------------------|-------------------|
| 코드량 | 200+ LOC | ~50 LOC |
| 서비스 호출 | 모든 서비스 | `AutoUpdateService`만 |
| 이벤트 리스너 | ✅ 지원 | ❌ 불필요 |
| 분할 메시지 | ✅ 지원 | ❌ 불필요 (버전 정보는 작음) |
| 보안 | 공격 표면 넓음 | 최소화 |

#### 영향 범위

1. **ServiceServer**: V1 핸들러 → 미들웨어 호출로 변경
2. **OrmService**: V1 소켓 타입 참조 제거
3. **ServiceExecutor**: V1 관련 분기 제거
4. **index.ts**: V1 export 제거, 미들웨어 export 추가

---

## 상세 파일 매핑

### service-common

| 레거시 경로 | 신규 경로 |
|------------|----------|
| `protocol/SdServiceProtocol.ts` | `protocol/service-protocol.ts` |
| `protocol/protocol.types.ts` | `protocol/protocol.types.ts` |
| `service-types/*.ts` | `service-types/*.ts` |
| `types.ts` | `types.ts` |

### service-client

| 레거시 경로 | 신규 경로 |
|------------|----------|
| `SdServiceClient.ts` | `service-client.ts` |
| `transport/SdServiceTransport.ts` | `transport/service-transport.ts` |
| `transport/SdSocketProvider.ts` | `transport/socket-provider.ts` |
| `protocol/SdServiceClientProtocolWrapper.ts` | `protocol/client-protocol-wrapper.ts` |
| `features/event/SdServiceEventClient.ts` | `features/event-client.ts` |
| `features/file/SdServiceFileClient.ts` | `features/file-client.ts` |
| `features/orm/*.ts` | `features/orm/*.ts` |
| `types/*.ts` | `types/*.ts` |
| `workers/client-protocol.worker.ts` | `workers/client-protocol.worker.ts` |

### service-server

| 레거시 경로 | 신규 경로 |
|------------|----------|
| `SdServiceServer.ts` | `service-server.ts` |
| `core/SdServiceBase.ts` | `core/service-base.ts` |
| `core/SdServiceExecutor.ts` | `core/service-executor.ts` |
| `auth/*.ts` | `auth/*.ts` |
| `transport/socket/SdWebSocketHandler.ts` | `transport/socket/websocket-handler.ts` |
| `transport/socket/SdServiceSocket.ts` | `transport/socket/service-socket.ts` |
| `transport/http/*.ts` | `transport/http/*.ts` |
| `protocol/*.ts` | `protocol/*.ts` |
| `services/*.ts` | `services/*.ts` |
| `utils/SdConfigManager.ts` | `utils/config-manager.ts` |
| `types/*.ts` | `types/*.ts` |
| `legacy/*` | ❌ 제거 |

---

## 하드코딩 상수 (유지)

> 변경할 일 없으므로 하드코딩 유지

| 위치 | 상수 | 값 | 비고 |
|------|------|-----|------|
| `ServiceProtocol` | `_MAX_TOTAL_SIZE` | 100MB | 메시지 최대 크기 |
| `ServiceProtocol` | `_SPLIT_MESSAGE_SIZE` | 3MB | 청킹 임계값 |
| `ServiceProtocol` | `_CHUNK_SIZE` | 300KB | 청크 크기 |
| `LazyGcMap` | `gcInterval` | 10초 | GC 주기 |
| `LazyGcMap` | `expireTime` | 60초 | 만료 시간 |
| `SocketProvider` | `_HEARTBEAT_TIMEOUT` | 30초 | 하트비트 타임아웃 |
| `SocketProvider` | `_HEARTBEAT_INTERVAL` | 5초 | 핑 주기 |
| `SocketProvider` | `_RECONNECT_DELAY` | 3초 | 재연결 대기 |
| `JwtManager` | 만료 시간 | 12h | JWT 유효기간 |

---

## 검증 체크리스트

### Phase 1: service-common ✅

- [x] TypeScript 컴파일: `npx tsc --noEmit -p packages/service-common/tsconfig.json`
- [x] ESLint: `npx eslint "packages/service-common/**/*.ts"`
- [ ] Vitest: N/A (타입/프로토콜 정의만 포함, 테스트 불필요)

### Phase 2: service-server 완료 시

- [ ] TypeScript 컴파일: `npx tsc --noEmit -p packages/service-server/tsconfig.json`
- [ ] ESLint: `npx eslint "packages/service-server/**/*.ts"`
- [ ] Vitest: `npx vitest run packages/service-server`

### Phase 3: service-client 완료 시

- [ ] TypeScript 컴파일: `npx tsc --noEmit -p packages/service-client/tsconfig.json`
- [ ] ESLint: `npx eslint "packages/service-client/**/*.ts"`
- [ ] Vitest: `npx vitest run packages/service-client`

### 통합 테스트

- [ ] 클라이언트 ↔ 서버 WebSocket 연결
- [ ] 인증 플로우 (로그인 → JWT → 권한 검사)
- [ ] 서비스 메소드 호출
- [ ] 이벤트 발행/구독
- [ ] 파일 업/다운로드
- [ ] ORM 서비스 (쿼리 실행)
- [ ] 자동 재연결

---

## 위험 요소 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| V1 레거시 제거 | 기존 V1 클라이언트 호환 불가 | 마이그레이션 가이드 작성, 버전 분리 |
| Fastify 플러그인 호환성 | 서버 구동 실패 | 플러그인 버전 고정 |
| JWT 라이브러리 변경 | 토큰 검증 실패 | jose 라이브러리 유지 |
| WebSocket 프로토콜 변경 | 통신 불가 | 프로토콜 버전 체크 유지 |
| 빌트인 서비스 의존성 | 기존 프로젝트 영향 | 인터페이스 호환 유지 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-07 | 초안 작성 - sd-service-* 분석 및 마이그레이션 계획 수립 |
| 2026-01-07 | V1 레거시 → 미들웨어 대체 방안 확정 (auto-update만 지원) |
| 2026-01-07 | 결정 사항 확정: Sd 제거, 하드코딩 유지, pino 로깅, 타입 안전 이벤트 |
| 2026-01-07 | 추가 결정: 파일명 케밥케이스, EventEmitter 폴리필, API 엔드포인트 유지 |
| 2026-01-07 | **Phase 1: service-common 마이그레이션 완료** |
| 2026-01-07 | 계획 업데이트: Phase 1 완료 상태 반영, 검증 체크리스트 업데이트 |
| 2026-01-07 | **Phase 순서 변경**: service-server(Phase 2) → service-client(Phase 3) |
| 2026-01-08 | **서비스 타입 공유 전략 확정**: `export type` 패턴으로 common 인터페이스 불필요 |
