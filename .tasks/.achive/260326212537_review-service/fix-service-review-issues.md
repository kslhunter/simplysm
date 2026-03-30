# Feature: service-* 패키지 리뷰 이슈 수정

## 참조 자료

- [review.md](review.md) — 코드 리뷰 리포트 (17건 이슈)
- 대상 패키지: `packages/service-common`, `packages/service-client`, `packages/service-server`
- 기술 스택: TypeScript ESNext strict, Fastify, WebSocket(ws), JWT(jose)
- 환경 구분: `@simplysm/core-common`의 `env.DEV` (빌드 시 DEV 환경변수로 제어)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | SmtpClientService 처리 | 서비스 및 관련 타입 삭제 | 소비앱이 메일 기능을 자체 처리. this 바인딩(LOGIC-002), 인증 부재(SEC-001), TLS(SEC-003) 3건 동시 해결 |
| D2 | 에러 응답 stack trace 제어 | `env.DEV`일 때만 포함 | core-common의 기존 env 패턴 활용. NODE_ENV가 아닌 빌드 타임 DEV 플래그 사용 |
| D3 | auth 미설정 시 동작 | `auth?: { jwtSecret: string } \| false` 타입 변경 | `false`=의도적 비활성화(스킵), `undefined`=설정 누락(에러). 서버 시작 시 + 호출 시 양쪽 검사 |
| D4 | progress 콜백 혼합 | request/response/server 3종 분리 | 클라이언트 전송 진행률과 서버 비즈니스 진행률을 구분할 수 있도록 함 |

## 요구명세

```gherkin
Feature: service-* 패키지 리뷰 이슈 수정

  Background:
    Given service-common, service-client, service-server 패키지가 존재한다

  Rule: SmtpClientService를 제거한다

    Scenario: SmtpClientService 관련 파일 삭제
      When SmtpClientService 서비스 파일과 타입 파일을 삭제한다
      Then packages/service-server/src/services/smtp-client-service.ts가 존재하지 않는다
      And packages/service-common/src/service-types/smtp-client-service.types.ts가 존재하지 않는다
      And 각 패키지의 index.ts에서 관련 export가 제거된다

  Rule: V1 핸들러는 async 함수의 결과를 올바르게 반환한다

    Scenario: V1 클라이언트가 getLastVersion을 요청한다
      Given V1 레거시 클라이언트가 WebSocket으로 연결되어 있다
      When SdAutoUpdateService.getLastVersion 명령을 전송한다
      Then 응답의 body에 실제 버전 정보가 포함된다 (Promise 객체가 아님)

  Rule: 프로토콜 청크 재조립은 무결성을 보장한다

    Scenario: completedSize가 totalSize와 일치하면 메시지를 재조립한다
      Given 3개의 청크로 분할된 메시지가 있다
      When 3개의 청크가 모두 도착하여 completedSize === totalSize이다
      Then 메시지가 정상적으로 재조립된다

    Scenario: completedSize가 totalSize를 초과하면 에러를 발생시킨다
      Given 메시지 청크가 수신 중이다
      When 누적 completedSize가 totalSize를 초과한다
      Then 프로토콜 무결성 위반 에러가 발생한다
      And 해당 메시지의 accumulator 항목이 정리된다

  Rule: 에러 응답은 DEV 빌드에서만 stack trace를 포함한다

    Scenario: DEV 빌드에서 에러 발생 시 stack trace 포함
      Given env.DEV가 true인 빌드이다
      When 서비스 메서드 호출 중 에러가 발생한다
      Then 에러 응답에 stack 필드가 포함된다

    Scenario: PROD 빌드에서 에러 발생 시 stack trace 미포함
      Given env.DEV가 false인 빌드이다
      When 서비스 메서드 호출 중 에러가 발생한다
      Then 에러 응답에 stack 필드가 포함되지 않는다
      And 에러 메시지만 전달된다

  Rule: auth 설정이 누락된 서버에서 인증 요구 서비스를 호출하면 에러가 발생한다

    Scenario: auth 미설정 + auth 요구 서비스 등록 시 서버 시작 에러
      Given auth 옵션이 설정되지 않았다 (undefined)
      And auth() 데코레이터가 있는 서비스가 등록되어 있다
      When 서버를 시작한다 (listen)
      Then "auth 설정이 필요합니다" 에러가 발생한다

    Scenario: auth 미설정 + auth 요구 메서드 호출 시 에러
      Given auth 옵션이 설정되지 않았다 (undefined)
      When auth 요구 메서드를 호출한다
      Then "auth 설정이 필요합니다" 에러가 발생한다

    Scenario: auth: false + auth 요구 서비스 호출 시 인증 스킵
      Given auth 옵션이 false로 설정되어 있다
      When auth 요구 메서드를 호출한다
      Then 인증 검사 없이 메서드가 실행된다

    Scenario: auth 설정 + auth 요구 서비스 호출 시 정상 인증
      Given auth 옵션이 { jwtSecret: "..." }로 설정되어 있다
      When auth 요구 메서드를 호출한다
      Then 토큰 기반 인증 검사가 수행된다

  Rule: HTTP API는 지원하는 메서드만 허용한다

    Scenario: GET/POST 요청은 정상 처리된다
      When GET 또는 POST로 /api 라우트에 요청한다
      Then 서비스 메서드가 실행되고 응답이 반환된다

    Scenario: PUT/DELETE/PATCH 요청은 405 응답을 반환한다
      When PUT, DELETE, 또는 PATCH로 /api 라우트에 요청한다
      Then 405 Method Not Allowed 응답이 반환된다

  Rule: progress 콜백은 의미별로 분리된다

    Scenario: 클라이언트 청크 전송 시 request progress가 보고된다
      Given 대용량 메시지를 청크로 분할하여 전송한다
      When 각 청크가 전송될 때마다
      Then progress.request 콜백이 호출된다

    Scenario: 서버 비즈니스 진행률은 server progress로 보고된다
      Given 서비스 메서드가 진행률을 보고한다
      When 서버가 progress 메시지를 보낸다
      Then progress.server 콜백이 호출된다 (progress.request가 아님)

  Rule: DB 연결 해제 후 connId가 초기화된다

    Scenario: close() 후 connId가 undefined가 된다
      Given OrmClientDbContextExecutor가 DB에 연결되어 있다
      When close()를 호출한다
      Then _connId가 undefined로 초기화된다

    Scenario: close() 후 DB 작업 호출 시 에러
      Given OrmClientDbContextExecutor.close()가 호출된 상태이다
      When executeDefs()를 호출한다
      Then 연결되지 않았다는 에러가 발생한다

  Rule: 파일 업로드 실패 시 이미 저장된 파일도 정리된다

    Scenario: 3개 파일 업로드 중 2번째에서 실패
      Given 3개의 파일을 멀티파트로 업로드한다
      When 2번째 파일 처리 중 에러가 발생한다
      Then 1번째 파일(이미 저장됨)도 삭제된다
      And 500 에러가 반환된다

  Rule: ServiceProtocol 리소스가 적절히 해제된다

    Scenario: ServiceClient.close() 시 protocol.dispose() 호출
      Given ServiceClient가 활성 상태이다
      When close()를 호출한다
      Then 내부 ServiceProtocol의 dispose()가 호출된다
      And GC 타이머가 정리된다

  Rule: OrmService.connect() 인터페이스 타입이 구현체와 일치한다

    Scenario: connect() 파라미터 타입이 정확하다
      Given OrmService 인터페이스를 참조한다
      When connect()의 파라미터 타입을 확인한다
      Then DbConnOptions & { configName: string } 타입이다 (Record<string, unknown>이 아님)

  Rule: 독립적인 비동기 작업은 병렬로 처리된다

    Scenario: evt:emit에서 모든 소켓에 병렬 전송
      Given 10개의 소켓이 이벤트를 구독하고 있다
      When 이벤트가 emit된다
      Then 10개의 소켓에 Promise.allSettled로 병렬 전송된다

    Scenario: resubscribeAll에서 모든 리스너 병렬 재구독
      Given 5개의 이벤트 리스너가 등록되어 있다
      When 재연결 후 resubscribeAll()이 호출된다
      Then 5개의 리스너가 Promise.allSettled로 병렬 재구독된다

  Rule: 서비스명은 첫 번째 점(.)만 기준으로 구분된다

    Scenario: 단일 점으로 구분된 서비스명
      Given message.name이 "SmtpClient.send"이다
      When 서비스명과 메서드명을 분리한다
      Then serviceName은 "SmtpClient", methodName은 "send"이다

    Scenario: 다중 점이 포함된 서비스명
      Given message.name이 "Namespace.Service.method"이다
      When 서비스명과 메서드명을 분리한다
      Then serviceName은 "Namespace", methodName은 "Service.method"이다

  Rule: 이벤트 핸들러는 중복 등록되지 않는다

    Scenario: listen()을 2회 호출해도 SIGINT 핸들러는 1회만 등록
      Given 서버가 close() 후 다시 listen()한다
      When SIGINT 시그널이 발생한다
      Then shutdownHandler가 1회만 실행된다
```

## 구현계획

### 배경

service-common, service-client, service-server 3개 패키지에서 코드 리뷰로 발견된 17건의 이슈를 수정한다. SmtpClientService 삭제로 3건이 자동 해결되어 실제 코드 수정 대상은 14건이다.

### 목표

- Critical 2건 해결 (V1 handler await, completedSize 검증)
- 보안 2건 해결 (stack trace, auth 우회)
- 로직/설계/성능 10건 해결

### 비목표

- SmtpClientService를 대체하는 새로운 메일 서비스 (소비앱에서 자체 구현)
- progress 콜백 변경에 따른 소비앱 측 마이그레이션 (소비앱에서 별도 처리)

### 설계

#### auth 옵션 타입 변경

```typescript
// server-options.ts
export interface ServiceServerOptions {
  // ...
  auth?: { jwtSecret: string } | false;  // undefined=누락, false=의도적 비활성화
}
```

#### auth 검증 로직

```
auth 값          | 서버 시작 시                    | 메서드 호출 시
-----------------|-------------------------------|---------------------------
{ jwtSecret }    | 통과                           | 정상 인증 검사
false            | 통과                           | requiredPerms 무시 (스킵)
undefined        | auth 요구 서비스 있으면 에러     | requiredPerms 있으면 에러
```

#### progress 타입 확장

```typescript
// progress.types.ts
export interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
  server?: (s: ServiceProgressState) => void;  // 추가
}
```

#### stack trace 조건부 포함

```typescript
// websocket-handler.ts
body: {
  name: error.name,
  message: error.message,
  code: "INTERNAL_ERROR",
  ...(env.DEV ? { stack: error.stack } : {}),
}
```

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| SmtpClientService에 auth 추가 | 미채택 | 소비앱이 메일 자체 처리. 서비스 자체 불필요 |
| NODE_ENV로 stack trace 제어 | 미채택 | 프로젝트 기존 패턴은 env.DEV (빌드 타임 플래그) |
| debug 서버 옵션 추가 | 미채택 | 빌드 vs 런타임 문제이므로 process.env/env가 적합 |
| auth 메서드 호출 시만 검사 | 미채택 | 서버 시작 시 조기 발견도 필요 |

### Vertical Slices

#### Slice 1: SmtpClientService 삭제 + OrmService 타입 수정
- [x] **구현 내용:** SmtpClientService 관련 파일 삭제, index.ts에서 export 제거, OrmService.connect() 파라미터 타입을 `DbConnOptions & { configName: string }`으로 수정
- **파일:**
  - 삭제: `service-server/src/services/smtp-client-service.ts`
  - 삭제: `service-common/src/service-types/smtp-client-service.types.ts`
  - 수정: `service-common/src/index.ts` (line 8 제거)
  - 수정: `service-server/src/index.ts` (line 27 제거)
  - 수정: `service-common/src/service-types/orm-service.types.ts` (line 22)
- **Scenarios:**
  - Scenario: SmtpClientService 관련 파일 삭제
  - Scenario: connect() 파라미터 타입이 정확하다

#### Slice 2: 프로토콜 무결성 — completedSize 검증
- [x] **구현 내용:** `create-service-protocol.ts`의 decode()에서 `completedSize > totalSize` 방어 추가. `===` 일 때만 완성으로 처리하고, `>` 이면 에러 발생 후 accumulator 항목 삭제
- **파일:**
  - 수정: `service-common/src/protocol/create-service-protocol.ts` (line 201-208)
- **Scenarios:**
  - Scenario: completedSize가 totalSize와 일치하면 메시지를 재조립한다
  - Scenario: completedSize가 totalSize를 초과하면 에러를 발생시킨다

#### Slice 3: V1 핸들러 await 수정
- [x] **구현 내용:** `handleV1Connection`의 message 콜백을 `async`로 변경하고, `getLastVersion()` 호출에 `await` 추가
- **파일:**
  - 수정: `service-server/src/legacy/v1-auto-update-handler.ts` (line 32, 41)
- **Scenarios:**
  - Scenario: V1 클라이언트가 getLastVersion을 요청한다

#### Slice 4: auth: false 패턴 도입
- [x] **구현 내용:** `ServiceServerOptions.auth` 타입을 `{ jwtSecret: string } | false`로 변경. `service-executor.ts`에서 `auth === undefined`일 때 에러. `auth === false`일 때 스킵. `service-server.ts`의 `listen()`에서 시작 시 검증 추가. `createWebSocketHandler`와 `handleHttpRequest`에 전달하는 jwtSecret 로직 수정
- **파일:**
  - 수정: `service-server/src/types/server-options.ts` (line 10)
  - 수정: `service-server/src/core/service-executor.ts` (line 44-62)
  - 수정: `service-server/src/service-server.ts` (constructor, listen)
- **Scenarios:**
  - Scenario: auth 미설정 + auth 요구 서비스 등록 시 서버 시작 에러
  - Scenario: auth 미설정 + auth 요구 메서드 호출 시 에러
  - Scenario: auth: false + auth 요구 서비스 호출 시 인증 스킵
  - Scenario: auth 설정 + auth 요구 서비스 호출 시 정상 인증

#### Slice 5: WebSocket 보안/로직 (stack trace + 서비스명 분리 + 병렬화)
- [x] **구현 내용:** (1) 에러 응답에서 `env.DEV`일 때만 stack 포함 (line 131, 148). (2) 서비스명 분리를 `indexOf(".")`+`substring`으로 변경 (line 75). (3) evt:emit, broadcastReload, emit에서 `Promise.allSettled`로 병렬화 (line 102-113, 215-223, 237-248)
- **의존:** Slice 1 (SmtpClient 삭제)
- **파일:**
  - 수정: `service-server/src/transport/socket/websocket-handler.ts`
- **Scenarios:**
  - Scenario: DEV 빌드에서 에러 발생 시 stack trace 포함
  - Scenario: PROD 빌드에서 에러 발생 시 stack trace 미포함
  - Scenario: 단일 점으로 구분된 서비스명
  - Scenario: 다중 점이 포함된 서비스명
  - Scenario: evt:emit에서 모든 소켓에 병렬 전송

#### Slice 6: HTTP 405 + Upload 원자성 + SIGINT 중복 방지
- [x] **구현 내용:** (1) `handleHttpRequest`에서 GET/POST 이외 메서드에 405 반환 (line 60-71). (2) `handleUpload` catch에서 result 배열의 기저장 파일도 삭제 (line 77-85). (3) `_registerGracefulShutdown`에 중복 등록 방지 플래그 추가 (line 230)
- **파일:**
  - 수정: `service-server/src/transport/http/http-request-handler.ts`
  - 수정: `service-server/src/transport/http/upload-handler.ts`
  - 수정: `service-server/src/service-server.ts` (_registerGracefulShutdown)
- **Scenarios:**
  - Scenario: PUT/DELETE/PATCH 요청은 405 응답을 반환한다
  - Scenario: 3개 파일 업로드 중 2번째에서 실패
  - Scenario: listen()을 2회 호출해도 SIGINT 핸들러는 1회만 등록

#### Slice 7: Progress 3종 분리
- [x] **구현 내용:** `ServiceProgress`에 `server` 콜백 추가. `service-transport.ts`에서 서버 비즈니스 progress(`message.name === "progress"`)를 `progress.server`로 라우팅. `ServiceClient`에 `server-progress` 이벤트 추가
- **의존:** Slice 1
- **파일:**
  - 수정: `service-client/src/types/progress.types.ts`
  - 수정: `service-client/src/transport/service-transport.ts` (line 111-117)
  - 수정: `service-client/src/service-client.ts` (events, send)
- **Scenarios:**
  - Scenario: 클라이언트 청크 전송 시 request progress가 보고된다
  - Scenario: 서버 비즈니스 진행률은 server progress로 보고된다

#### Slice 8: 클라이언트 리소스 관리 (dispose + connId + resubscribe 병렬화)
- [x] **구현 내용:** (1) `ClientProtocolWrapper`에 `dispose()` 추가 → protocol.dispose() + workerResolvers.dispose() 호출. `ServiceClient.close()`에서 호출. (2) `OrmClientDbContextExecutor.close()` 후 `this._connId = undefined`. (3) `resubscribeAll()`을 `Promise.allSettled`로 병렬화
- **파일:**
  - 수정: `service-client/src/protocol/client-protocol-wrapper.ts` (interface + 구현)
  - 수정: `service-client/src/service-client.ts` (close)
  - 수정: `service-client/src/features/orm/orm-client-db-context-executor.ts` (line 64)
  - 수정: `service-client/src/features/event-client.ts` (line 92-103)
- **Scenarios:**
  - Scenario: ServiceClient.close() 시 protocol.dispose() 호출
  - Scenario: close() 후 connId가 undefined가 된다
  - Scenario: close() 후 DB 작업 호출 시 에러
  - Scenario: resubscribeAll에서 모든 리스너 병렬 재구독
