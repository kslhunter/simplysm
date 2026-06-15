# @simplysm/service-server — 전송 계층 내부

`ServiceServer.listen()` 이 내부적으로 구성하는 저수준 전송·프로토콜·실행기. 일반 앱 작성에서는 `createServiceServer` 가 알아서 엮으므로 직접 쓸 일이 없고, 커스텀 전송을 손수 조립하거나 동작을 테스트·디버깅·확장할 때만 참조한다.

## executeServiceMethod

```ts
function executeServiceMethod(
  server: ServiceServer,
  def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
    http?: { clientName: string; authTokenPayload?: AuthTokenPayload };
  },
): Promise<unknown>;
```

요청 1건을 실제 서비스 메서드로 라우팅·실행하는 핵심 게이트키퍼. WebSocket·HTTP 핸들러가 모두 이 함수로 수렴한다.

- `serviceName` / `methodName` — `server.options.services` 의 `names` 매칭으로 서비스를, 그 팩토리 산출 객체에서 메서드를 찾는다. 없으면 throw.
- `params: unknown[]` — 메서드 인자 배열. 스프레드되어 메서드에 전달된다.
- `socket?` / `http?` — 둘 중 하나로 요청 출처를 전달. `clientName` 에 `..`·슬래시(`/`·`\`)가 있으면 보안 차단 throw.
- 동작 순서: 컨텍스트 생성 → 팩토리 호출 → 메서드 조회 → 인증·권한 검사(`auth` 래핑 권한 기준) → 실행 후 반환값 반환. `auth: false` 면 인증 스킵, `auth` 미설정인데 권한 요구 메서드면 설정 오류 throw.

## createServiceContext

```ts
function createServiceContext<TAuthInfo>(server, socket?, http?, legacy?): ServiceContext<TAuthInfo>;
```

`ServiceContext`(인증·클라이언트·설정 접근자) 인스턴스를 만든다.

- `server` — 서버 인스턴스(필수).
- `socket?: ServiceSocket` — 들어오면 `authInfo`·`clientName` 출처가 소켓 우선.
- `http?: { clientName; authTokenPayload? }` — HTTP 요청 출처.
- `legacy?: { clientName? }` — V1 레거시 출처(`clientName` 만).

컨텍스트 필드 의미는 [service-authoring.md](./service-authoring.md) 의 ServiceContext 절 참조. 테스트에서 컨텍스트를 직접 만들어 서비스 메서드를 단위 호출할 때 유용하다.

## ServiceSocket / createServiceSocket

단일 WebSocket 연결을 감싸 프로토콜 인코딩·ping/pong 연결 유지·이벤트 리스너 추적을 담당하는 인터페이스. `createServiceSocket(socket, clientId, clientName, connReq)` 로 생성한다.

- `readonly connectedAtDateTime: DateTime` — 연결 성립 시각.
- `readonly clientName: string` — 연결 시 받은 클라이언트 이름.
- `readonly connReq: FastifyRequest` — 원본 연결 요청(원격 주소 등).
- `authTokenPayload?: AuthTokenPayload` — 소켓 `auth` 메시지로 검증된 토큰. 이후 그 소켓 요청의 `ctx.authInfo` 출처(set 으로 갱신).
- `close(): void` — 소켓 즉시 종료(terminate).
- `send(uuid, msg): Promise<number>` — 서버 메시지를 프로토콜로 인코딩해 전송하고 보낸 바이트 수 반환(소켓 미개방이면 `0`).
- `addListener(key, eventName, info): void` — 이벤트 구독 등록. `key` 는 구독 식별자, `info` 는 selector 매칭용 메타.
- `removeListener(key): void` — `key` 로 구독 1건 해제.
- `getEventListeners(eventName): { key; info }[]` — 해당 이벤트의 구독 목록 조회.
- `filterEventTargetKeys(targetKeys): string[]` — 주어진 키 중 이 소켓에 존재하는 것만 반환.
- `on("error" | "close" | "message", handler): void` — 소켓 이벤트 후킹. 5초 주기로 ping 하고 pong 미수신 시 자동 terminate 한다.

## WebSocketHandler / createWebSocketHandler

```ts
function createWebSocketHandler(
  runMethod: (def) => Promise<unknown>,
  jwtSecret: string | undefined,
): WebSocketHandler;
```

여러 `ServiceSocket` 을 `clientId` 로 관리하고, 클라이언트 메시지를 `runMethod`(보통 `executeServiceMethod` 바인딩)로 라우팅하며, 이벤트를 브로드캐스트한다.

- `addSocket(socket, clientId, clientName, connReq): void` — 연결 등록. 같은 `clientId` 의 기존 연결은 닫고 교체한다. 생성 중 예외 시 소켓 terminate.
- `closeAll(): void` — 모든 연결 종료(서버 `close()` 시 호출).
- `emit<TEventDef>(eventName, infoSelector, data): Promise<void>` — 전 소켓의 해당 이벤트 구독 중 `infoSelector(info)` 가 `true` 인 키에게만 `evt:on` 메시지 전송. `ServiceServer.emitEvent` 의 실제 구현.
- 처리하는 클라이언트 메시지 종류: `"<service>.<method>"`(RPC 호출), `evt:add`·`evt:remove`·`evt:gets`·`evt:emit`(이벤트 구독·해제·조회·발생), `auth`(소켓 토큰 검증). 그 외는 `BAD_MESSAGE` 에러 응답. 처리 중 예외는 `INTERNAL_ERROR` 응답이며, `DEV` 환경에서만 에러 스택을 포함한다.

## HTTP / 정적 / 업로드 핸들러

`fastify` 라우트에 직접 물리는 저수준 함수들. 커스텀 라우트를 짤 때만 직접 사용한다.

- `handleHttpRequest(req, reply, jwtSecret, runMethod)` — `/api/:service/:method` 처리. `x-sd-client-name` 헤더 필수, `Authorization: Bearer <token>` 검증(실패 시 401). GET 은 `?json=` 쿼리, POST 는 배열 본문에서 파라미터를 받아 `runMethod` 를 실행한다. 본문이 배열이 아니면 400, 그 외 HTTP 메서드는 405.
- `handleUpload(req, reply, rootPath, jwtSecret)` — `/upload` multipart 처리. multipart 가 아니면 400, 인증 토큰 필수(없거나 무효면 401). 파일을 `rootPath/www/uploads/<uuid><ext>` 로 저장하고 `ServiceUploadResult[]`(`{ path, filename, size }`) 반환. 도중 실패하면 그 요청에서 저장한 파일을 모두 롤백 삭제 후 500.
- `handleStaticFile(req, reply, rootPath, urlPath)` — `rootPath/www` 하위 정적 파일 전송. `www` 밖 경로는 차단(throw), 디렉터리면 슬래시 리다이렉트 후 `index.html`, `.` 으로 시작하는 숨김 파일은 403, 미존재는 404, 그 외 전송 실패는 500 HTML 응답. SPA 폴백: 미존재 + 확장자 없는 페이지 요청이면 `www` 루트 방향으로 가장 가까운 `index.csr.html`(SSG 클라이언트의 SPA 셸)을 찾아 반환 — 셸 파일이 없는 기존 클라이언트는 그대로 404.

## ServerProtocolWrapper / createServerProtocolWrapper

메시지 인코딩·디코딩을 크기·내용에 따라 worker 스레드와 메인 스레드로 자동 분배하는 래퍼. `createServerProtocolWrapper()` 로 생성한다(worker 는 지연 싱글턴이라 소켓 간 공유).

- `encode(uuid, message): Promise<{ chunks: Bytes[]; totalSize: number }>` — `body` 에 `Uint8Array` 가 있으면(단일이거나 배열 요소 중 하나라도) worker, 아니면 메인 스레드에서 인코딩.
- `decode(bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>` — 청크 재조립(stateful)은 항상 메인 스레드 단일 누적기에서 수행하고, 재조립 완료 후 30KB 초과 JSON 파싱(stateless)만 worker 에 위임. 진행 중이면 `{ type: "progress" }`, 완료면 `{ type: "complete", uuid, message }`.
- `dispose(): void` — 프로토콜 리소스 해제.

## getConfig

```ts
function getConfig<TConfig>(filePath: string): Promise<TConfig | undefined>;
```

`filePath` JSON 설정을 읽어 캐시·파일워치한다. `ServiceContext.getConfig` 의 내부 구현. 캐시 히트 시 즉시 반환(접근 시 만료 시간 갱신), 파일 변경 시 자동 리로드, 1시간 무접근 시 캐시·워처 GC. 파일이 없으면 `undefined`.
