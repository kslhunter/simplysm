# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/service-server/README.md`를 참조한다.

## Package Overview

- 패키지: `@simplysm/service-server`
- 설명: Fastify 기반 서비스 서버 패키지. WebSocket/HTTP 전송, JWT 인증, 서비스 실행, ORM 브리지, 자동 업데이트 서비스를 제공한다.
- 소스 파일 수: `src/` 기준 19개 TypeScript 파일
- 공개 진입점: `src/index.ts`
- 주요 런타임 의존성: `fastify`, `@fastify/websocket`, `@fastify/static`, `@fastify/multipart`, `@fastify/helmet`, `@fastify/cors`, `jose`, `ws`

## Architecture

```text
src/
  auth/                 JWT payload 타입과 sign/verify/decode 함수
  core/                 서비스 정의, 인증 래퍼, 실행 파이프라인, ServiceContext
  legacy/               V1 WebSocket 자동 업데이트 호환 핸들러
  protocol/             service-common 프로토콜 worker 위임 래퍼
  services/             내장 서비스(AppStructure, AutoUpdate, Orm)
  transport/http/       HTTP API, 업로드, 정적 파일 핸들러
  transport/socket/     WebSocket 연결 추상화와 라우팅 핸들러
  types/                서버 옵션 타입
  utils/                .config.json 캐시/워처 유틸리티
  workers/              프로토콜 encode/decode worker 엔트리
```

의존 흐름은 `ServiceServer`가 Fastify 플러그인과 라우트를 구성하고, HTTP/WebSocket 핸들러가 `executeServiceMethod()`로 서비스 정의를 실행하는 구조다. 서비스 구현은 `defineService()`로 `ServiceDefinition`을 만들며, 인증 요구사항은 함수 객체에 심볼 메타데이터를 붙이는 `auth()` 래퍼로 전달된다.

## Key Patterns

### 서비스 정의와 인증 메타데이터

서비스는 이름과 컨텍스트 기반 팩토리로 정의한다. `auth()`는 호출 동작을 유지하는 래퍼를 만들고, 권한 배열을 심볼 키에 저장한다.

```typescript
const UserService = defineService(
  "User",
  auth((ctx) => ({
    getProfile: () => ctx.authInfo,
    adminOnly: auth(["admin"], () => "admin"),
  })),
);
```

`executeServiceMethod()`는 서비스 수준 권한과 메서드 수준 권한을 순서대로 확인한다. 메서드에 `auth()`가 있으면 해당 권한이 서비스 수준 권한보다 우선한다.

### 컨텍스트의 clientName 보안 가드

`ServiceContext.clientName`은 WebSocket, HTTP, legacy 컨텍스트에서 이름을 읽고 `..`, `/`, `\`가 포함된 값을 거부한다. `clientPath`는 검증된 이름만 사용해 `rootPath/www/{clientName}`으로 계산한다.

```typescript
if (name === "" || name.includes("..") || name.includes("/") || name.includes("\\")) {
  throw new Error(`유효하지 않은 클라이언트 이름: ${name}`);
}
```

클라이언트별 `.config.json` 병합, 자동 업데이트 경로 계산, 정적 파일 접근은 이 보안 가드를 전제로 한다.

### HTTP와 WebSocket의 동일 실행 파이프라인

HTTP `POST /api/:service/:method`와 WebSocket `Service.Method` 메시지는 모두 `executeServiceMethod()`로 모인다. HTTP는 `x-sd-client-name` 헤더와 선택적 Bearer 토큰을 컨텍스트로 전달하고, WebSocket은 인증 메시지(`auth`) 이후 `ServiceSocket.authTokenPayload`를 사용한다.

### 프로토콜 worker 위임

`createServerProtocolWrapper()`는 메시지 인코딩/디코딩을 메인 스레드와 worker로 나눈다. `Uint8Array` 본문 또는 `Uint8Array`가 포함된 배열은 encode 시 worker를 사용하고, decode 입력이 30KB를 넘으면 worker를 사용한다.

### 소켓 단위 ORM 연결 관리

`OrmService`는 `WeakMap<ServiceSocket, Map<number, DbConn>>`로 WebSocket 연결별 DB 연결을 저장한다. 소켓이 닫히면 해당 소켓에서 열린 DB 연결을 모두 닫고 맵을 비운다. 이 서비스는 `ctx.socket`이 없으면 에러를 던지므로 HTTP 전송으로 사용할 수 없다.

### 설정 파일 캐시와 워처

`getConfig()`는 파일 경로별로 JSON 설정을 캐시하고 `FsWatcher`로 변경을 감지한다. 캐시는 `LazyGcMap`으로 10분마다 GC를 실행하고, 1시간 만료 시 해당 파일 워처를 닫는다.

## Testing

패키지 테스트는 `packages/service-server/tests`에 있다.

- `define-service.spec.ts`: `defineService()`, `auth()`, `getServiceAuthPermissions()`의 메타데이터 동작 검증
- `service-executor.spec.ts`: 서비스/메서드 검색, 인증 필요 여부, 역할 권한, `auth: false` 동작 검증
- `app-structure-service.spec.ts`: `AppStructureService()`가 `itemsMap` 참조를 그대로 반환하는 동작 검증
- `orm-service.spec.ts`: ORM 서비스의 연결/쿼리 메서드 계약 검증
- `*.acc.spec.ts`와 `*.verify.md`: 출력 기반 승인 테스트와 검증 문서

테스트에서 패키지 공개 API를 확인할 때는 `@simplysm/service-server` import를 우선 사용한다. 실행 파이프라인 내부 단위 테스트처럼 공개 API만으로 접근이 어려운 경우에만 `src/` 내부 모듈을 직접 import한다.

## Package-Specific Compiler Notes

`packages/service-server/tsconfig.json`은 루트 설정을 확장하고 `lib: ["ESNext"]`, `outDir: "./dist"`, `typeRoots: ["./node_modules/@types"]`만 패키지 고유 옵션으로 둔다.
