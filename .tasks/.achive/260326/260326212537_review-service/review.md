# 코드 리뷰: service-* 패키지

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/service-common`, `packages/service-client`, `packages/service-server` |
| 분석 일시 | 2026-03-26 21:25 |
| 소스 파일 수 | 35개 (테스트 제외) |
| 발견 이슈 | **17건** (Critical 3, Medium 9, Low 5) |

---

## Critical

### LOGIC-001: v1-auto-update-handler에서 async/await 누락 — Promise 객체가 응답으로 전송됨

```
severity: Critical
category: 로직
location: packages/service-server/src/legacy/v1-auto-update-handler.ts:41
```

`getLastVersion()`은 `Promise<any>`를 반환하는 async 함수이지만, line 41에서 `await` 없이 호출한다.
`result`에 Promise 객체가 할당되고, `JSON.stringify(response)`에서 Promise는 `{}`로 직렬화된다.
또한 `socket.on("message")` 콜백 자체가 async가 아니므로 await를 추가해도 동작하지 않는다.

**결과:** V1 레거시 클라이언트의 자동 업데이트 응답이 항상 빈 body(`{}`)를 수신한다.

**개선 방향:** 콜백을 `async (data) => {`로 변경하고, line 41에 `await`를 추가한다.

---

### LOGIC-002: SmtpClientService.sendByConfig()에서 this 바인딩 손실 → 런타임 TypeError

```
severity: Critical
category: 로직
location: packages/service-server/src/services/smtp-client-service.ts:47
```

`SmtpClientService`는 `defineService()` 팩토리가 반환하는 **객체 리터럴** 내에서 `this.send()`를 호출한다.
그러나 `executeServiceMethod()` (service-executor.ts:38,66)에서는:

```typescript
const method = (methods as Record<string, unknown>)[def.methodName]; // line 38
return await method(...def.params); // line 66
```

메서드를 객체에서 추출한 후 독립적으로 호출하므로 `this`가 `undefined`가 된다(strict mode).
`sendByConfig()` 호출 시 `this.send()`에서 `TypeError: Cannot read properties of undefined (reading 'send')`가 발생한다.

**개선 방향:** `this.send()` 대신 팩토리 스코프 내의 내부 함수를 직접 참조하도록 리팩토링한다.

```typescript
export const SmtpClientService = defineService("SmtpClient", (ctx) => {
  async function send(options: SmtpClientSendOption): Promise<string> { ... }
  return {
    send,
    async sendByConfig(configName, options) {
      // ...
      return send({ ...config, ...options });
    },
  };
});
```

---

### LOGIC-003: completedSize > totalSize일 때 불완전 메시지를 완성으로 처리

```
severity: Critical
category: 로직
location: packages/service-common/src/protocol/create-service-protocol.ts:195-201
```

청크 재조립 로직에서 `completedSize < totalSize` 여부만 확인한다.
corrupt된 패킷이나 악의적으로 조작된 `totalSize`로 인해 `completedSize > totalSize`가 되면,
조건 `accItem.completedSize < accItem.totalSize`가 `false`가 되어 **불완전한 청크 집합으로 메시지 재조립을 시도**한다.

**개선 방향:** 세 가지로 분기한다:
- `completedSize < totalSize` → 진행 중 (progress 보고)
- `completedSize === totalSize` → 완성 (메시지 재조립)
- `completedSize > totalSize` → 에러 (무결성 위반)

---

## Medium

### SEC-001: SmtpClientService 인증 없이 외부 접근 가능

```
severity: Medium
category: 보안
location: packages/service-server/src/services/smtp-client-service.ts:9
```

`SmtpClientService`는 `auth()`로 래핑되어 있지 않다. 인증 없이 누구나 `send()` 메서드를 호출하여 임의의 SMTP 서버로 이메일을 발송할 수 있다. 스팸 릴레이로 악용될 수 있다.

**개선 방향:** `auth()`로 래핑하거나, `sendByConfig`만 외부에 노출하고 `send`는 내부 메서드로 제한한다.

---

### SEC-002: 에러 응답에 서버 stack trace 노출

```
severity: Medium
category: 보안
location: packages/service-server/src/transport/socket/websocket-handler.ts:148
```

에러 응답에 `error.stack`을 포함하여 클라이언트로 전송한다. 운영 환경에서 서버 내부 파일 경로, 함수명, 라인 번호가 노출되어 공격자에게 유용한 정보를 제공한다.

**개선 방향:** 운영 환경에서는 stack 필드를 생략하고, 개발 환경에서만 포함한다.

---

### LOGIC-004: auth 옵션 미설정 시 인증 데코레이터가 완전히 무시됨

```
severity: Medium
category: 로직
location: packages/service-server/src/core/service-executor.ts:44
```

`server.options.auth == null`이면 인증 검사 블록 전체가 스킵된다. 서비스/메서드에 `auth()` 데코레이터로 인증을 명시적으로 요구했더라도 인증 없이 호출 가능해진다.

**개선 방향:** `requiredPerms`가 존재하는데 `auth` 설정이 없으면 서버 시작 시 또는 메서드 호출 시 에러를 던진다.

---

### LOGIC-005: 미지원 HTTP 메서드 요청 시 응답 없이 무한 대기

```
severity: Medium
category: 로직
location: packages/service-server/src/transport/http/http-request-handler.ts:62-71
```

`service-server.ts:120`에서 `this.fastify.all()`로 모든 HTTP 메서드를 허용한다. 그러나 `handleHttpRequest()`는 GET과 POST만 처리하므로, PUT/DELETE/PATCH 등으로 `/api` 라우트에 접근하면 `params`가 `undefined`로 남아 `reply.send()`가 호출되지 않고 클라이언트가 무한 대기한다.

**개선 방향:** 미지원 HTTP 메서드에 대해 405 응답을 반환하거나, `fastify.all` 대신 `fastify.get`/`fastify.post`만 등록한다.

---

### LOGIC-006: 서버 비즈니스 progress가 request progress 콜백에 혼합 전달

```
severity: Medium
category: 로직
location: packages/service-client/src/transport/service-transport.ts:111-117
```

서버가 보내는 비즈니스 진행률(예: DB 작업 진행률)이 `progress?.request?.()`로 전달된다. 그러나 동일한 `request` 콜백이 line 72-78에서 청크 전송 진행률에도 사용되고 있어, 호출자 입장에서 두 가지 상이한 의미의 진행률이 하나의 콜백으로 섞인다.

**개선 방향:** 서버 측 비즈니스 진행률을 별도 콜백으로 분리하거나, 진행률 타입에 구분 필드를 추가한다.

---

### LOGIC-007: OrmClientDbContextExecutor.close() 후 _connId 미초기화

```
severity: Medium
category: 로직
location: packages/service-client/src/features/orm/orm-client-db-context-executor.ts:59-65
```

`close()` 메서드에서 서버 측 DB 연결을 해제하지만 `this._connId`를 `undefined`로 초기화하지 않는다. `close()` 후에 `beginTransaction()`, `executeDefs()` 등이 호출되면 이미 무효화된 connId로 서버에 요청을 보내게 된다.

**개선 방향:** `close()` 성공 후 `this._connId = undefined`를 추가한다.

---

### LOGIC-008: 멀티파트 업로드 실패 시 이미 저장된 파일 미정리

```
severity: Medium
category: 로직
location: packages/service-server/src/transport/http/upload-handler.ts:77-85
```

여러 파일 업로드 도중 에러가 발생하면 catch 블록에서 현재 파일(`currentSavePath`)만 삭제한다. 이전 반복에서 이미 저장된 파일들은 디스크에 남아 고아 파일이 된다.

**개선 방향:** catch 블록에서 `result` 배열에 이미 기록된 모든 파일도 삭제한다.

---

### DESIGN-001: ServiceProtocol dispose() 미호출 → GC 타이머 누수

```
severity: Medium
category: 설계
location: packages/service-client/src/protocol/client-protocol-wrapper.ts:15-26
```

`ServiceProtocol` 내부의 `LazyGcMap`(accumulator)이 GC 타이머(`setInterval`)를 사용하지만, 클라이언트 어디에서도 `protocol.dispose()`를 호출하지 않는다. Worker 내부(`client-protocol.worker.ts:6`)에서도 마찬가지다. SSR 환경이나 테스트에서 반복 생성/파괴 시 타이머 누수가 발생한다.

**개선 방향:** `ServiceClient.close()`에서 `protocol.dispose()`를 호출하도록 한다.

---

### DESIGN-002: OrmService.connect() 인터페이스 파라미터 타입 불일치

```
severity: Medium
category: 설계
location: packages/service-common/src/service-types/orm-service.types.ts:22
```

인터페이스에서 `connect()`의 파라미터가 `Record<string, unknown>`으로 선언되어 있으나, 실제 서버 구현체와 클라이언트 모두 `DbConnOptions & { configName: string }`으로 사용한다. 같은 파일의 `getInfo()`는 올바른 타입을 사용하고 있어, `connect()`만 누락된 것으로 보인다.

**개선 방향:** `connect()` 파라미터 타입을 `DbConnOptions & { configName: string }`으로 수정한다.

---

## Low

### PERF-001: evt:emit에서 모든 소켓에 순차 await

```
severity: Low
category: 성능
location: packages/service-server/src/transport/socket/websocket-handler.ts:99-113
```

`socketMap`의 모든 소켓에 대해 `for...of` 루프 안에서 `await subSock.send()`를 호출한다. 소켓이 N개일 때 총 시간은 각 send 시간의 합이다. `broadcastReload`(211-223행)과 `emit`(226-249행)에도 동일 패턴이 존재한다.

**개선 방향:** `Promise.allSettled()`로 병렬 전송한다.

---

### PERF-002: resubscribeAll() 직렬 await

```
severity: Low
category: 성능
location: packages/service-client/src/features/event-client.ts:93-102
```

재연결 후 `resubscribeAll()`에서 모든 리스너에 대해 직렬로 `await transport.send()`를 호출한다. 각 `evt:add` 요청은 독립적이므로 병렬 전송이 가능하다.

**개선 방향:** `Promise.allSettled()`로 병렬 전송하여 재연결 복구 시간을 줄인다.

---

### SEC-003: SMTP TLS rejectUnauthorized: false 하드코딩

```
severity: Low
category: 보안
location: packages/service-server/src/services/smtp-client-service.ts:24
```

`rejectUnauthorized: false`가 하드코딩되어 있어 SMTP 서버의 TLS 인증서 유효성을 검증하지 않는다. 중간자 공격(MITM)에 취약하다.

**개선 방향:** `rejectUnauthorized`를 설정(`SmtpClientDefaultOptions`)에서 제어 가능하게 하고, 기본값은 `true`로 설정한다.

---

### LOGIC-009: 서비스명에 점(.)이 여러 개 포함 시 잘못된 분리

```
severity: Low
category: 로직
location: packages/service-server/src/transport/socket/websocket-handler.ts:75
```

`message.name`을 `split(".")`하고 첫 두 요소만 destructuring한다. 서비스명이나 메서드명에 점이 포함된 경우(예: `"Namespace.Service.method"`), 의도한 메서드가 호출되지 않는다.

**개선 방향:** 첫 번째 점만 기준으로 분리하는 로직(`indexOf` + `substring`)을 사용한다.

---

### DESIGN-003: listen() 중복 호출 시 SIGINT/SIGTERM 핸들러 중복 등록

```
severity: Low
category: 설계
location: packages/service-server/src/service-server.ts:230-254
```

`_registerGracefulShutdown()`이 `listen()` 내에서 매번 호출된다. 서버를 `close()` 후 다시 `listen()`하면 `process.on("SIGINT"/"SIGTERM")` 핸들러가 중복 등록되어 종료 시 `shutdownHandler`가 여러 번 실행된다.

**개선 방향:** 핸들러 등록 여부를 플래그로 관리하거나, constructor에서 한 번만 등록한다.
