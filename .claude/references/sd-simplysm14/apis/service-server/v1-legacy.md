# @simplysm/service-server — V1 레거시 지원

`ver !== "2"`(구버전) WebSocket 클라이언트를 받기 위한 레거시 핸들러. 주로 구버전 앱의 자동업데이트(`SdAutoUpdateService.getLastVersion`) 요청을 처리한다. `ServiceServer` 는 ver=2 가 아닌 연결을 자동으로 이 핸들러로 넘긴다(`AutoUpdate` 서비스나 `legacyV1Handlers` 가 있을 때만, 둘 다 없으면 코드 1008 로 연결 거부). `ServiceServerOptions.legacyV1Handlers` 로 커스텀 핸들러를 끼울 때만 직접 다룬다.

## handleV1Connection

```ts
function handleV1Connection(socket, autoUpdateMethods: V1AutoUpdateMethods, clientNameSetter?): void;
function handleV1Connection(socket, options: V1ConnectionOptions): void;
```

V1 WebSocket 연결 1건을 받아 연결 알림(`{ name: "connected" }`) 전송 후 메시지를 처리한다. 처리 순서: 커스텀 핸들러들 → (미처리 시) `SdAutoUpdateService.getLastVersion` fallback → 그래도 미처리면 `UPGRADE_REQUIRED` 에러 응답. 메시지 파싱·처리 중 예외는 잡아 warn 로그만 남기고 응답하지 않는다.

- `socket: WebSocket` — `ws` 의 원시 소켓.
- 2번째 인자 — `V1AutoUpdateMethods` 객체(자동업데이트만 응대)이거나 `V1ConnectionOptions`(핸들러·팩토리 포함). `"getLastVersion" in arg` 로 분기.
- `clientNameSetter?` — 첫 시그니처에서만. 요청의 `clientName` 을 외부에 통지하는 콜백.

## V1ConnectionOptions

- `serviceContext?: ServiceContext` — 모든 요청에서 공유할 고정 컨텍스트.
- `serviceContextFactory?: (request: V1Request) => ServiceContext` — 요청마다 컨텍스트를 새로 만들 때. `serviceContext` 보다 우선.
- `handlers?: V1RequestHandler[]` — 커스텀 요청 핸들러 목록. 앞에서부터 호출되며 첫 `handled: true` 에서 멈춤. 핸들러가 있는데 컨텍스트가 없으면 throw.
- `autoUpdateMethods?: V1AutoUpdateMethods` — 자동업데이트 fallback 구현(고정).
- `autoUpdateMethodsFactory?: (ctx: V1RequestHandlerContext) => V1AutoUpdateMethods` — 요청마다 fallback 구현 생성. 지정 시 `autoUpdateMethods` 대신 사용(컨텍스트 없으면 throw).
- `clientNameSetter?: (clientName: string | undefined) => void` — 매 요청 `clientName` 통지 콜백.

## V1RequestHandler 와 관련 타입

- `V1Request` — `{ uuid: string; command: string; params: unknown[]; clientName?: string }`. 구버전 클라이언트가 보내는 요청 형태. `command` 는 `"<service>.<method>"` 형태의 명령 키.
- `V1Response` — `{ name: "response"; reqUuid: string; state: "success" | "error"; body: unknown }`. 서버가 돌려보내는 응답 형태. `state` = 응답 상태로 `"success"`(정상)·`"error"`(오류) 구분.
- `V1RequestHandlerContext` — `{ request: V1Request; serviceContext: ServiceContext }`. 핸들러가 받는 인자.
- `V1RequestHandlerResult` — `{ handled: true; state?: "success" | "error"; body: unknown } | { handled: false }`. `handled` = 이 핸들러가 요청을 처리했는지. `false` 면 다음 핸들러·fallback 으로 넘어가고, `true` 면 그 `state`(기본 `"success"`)·`body` 로 즉시 응답.
- `V1RequestHandler` — `(ctx: V1RequestHandlerContext) => V1RequestHandlerResult | Promise<V1RequestHandlerResult>`. 동기·비동기 모두 가능.
- `V1AutoUpdateMethods` — `{ getLastVersion: (platform: string) => Promise<unknown> | unknown }`. `SdAutoUpdateService.getLastVersion` 명령의 fallback 인터페이스.

```ts
const server = createServiceServer({
  rootPath, port,
  services: [AutoUpdateService], // ver!=2 연결 시 getLastVersion fallback 자동 연결
  legacyV1Handlers: [
    ({ request, serviceContext }) =>
      request.command === "Legacy.ping"
        ? { handled: true, body: "pong" }
        : { handled: false },
  ],
});
```

주의: `legacyV1Handlers` 도 없고 `AutoUpdate`(`SdAutoUpdateService`) 서비스도 등록 안 됐으면 ver≠2 연결은 코드 1008 로 즉시 거부된다.
