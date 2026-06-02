# @simplysm/service-server — v1-legacy

ver≠2(구버전) WebSocket 클라이언트를 받기 위한 레거시 핸들러. 주로 구버전 앱의 자동업데이트(`SdAutoUpdateService.getLastVersion`) 요청을 처리한다. `ServiceServer` 는 ver=2 가 아닌 연결을 자동으로 이 핸들러로 넘긴다(`AutoUpdate` 서비스나 `legacyV1Handlers` 가 있을 때만, 둘 다 없으면 연결 거부).

## handleV1Connection

- `handleV1Connection(socket, autoUpdateMethods: V1AutoUpdateMethods, clientNameSetter?): void`
- `handleV1Connection(socket, options: V1ConnectionOptions): void`

연결 즉시 `{ name: "connected" }` 전송 후, JSON 메시지(`V1Request`)를 받아 처리:

1. 등록된 `handlers` 를 순서대로 실행, `handled: true` 면 그 결과로 응답.
2. 미처리이고 command 가 `"SdAutoUpdateService.getLastVersion"` 이면 자동업데이트 fallback 실행.
3. 그 외엔 `{ message: "앱 업그레이드가 필요합니다.", code: "UPGRADE_REQUIRED" }` 에러 응답.

## 타입

- `V1Request` — `{ uuid: string; command: string; params: unknown[]; clientName?: string }`. 클라이언트 요청.
- `V1Response` — `{ name: "response"; reqUuid: string; state: "success" | "error"; body: unknown }`. 서버 응답 형식. `state` = 처리 결과("success" = 정상, "error" = 실패).
- `V1AutoUpdateMethods` — `{ getLastVersion(platform): Promise<unknown> | unknown }`. 자동업데이트 fallback 구현.
- `V1RequestHandlerResult` — `{ handled: true; state?: "success"|"error"; body }`(처리함, state 기본 success) 또는 `{ handled: false }`(다음 핸들러로 넘김).
- `V1RequestHandlerContext` — `{ request: V1Request; serviceContext: ServiceContext }`. 핸들러 인자.
- `V1RequestHandler` — `(ctx: V1RequestHandlerContext) => V1RequestHandlerResult | Promise<V1RequestHandlerResult>`. 커스텀 처리 함수. `ServiceServerOptions.legacyV1Handlers` 에 등록.
- `V1ConnectionOptions`:
  - `serviceContext?: ServiceContext` — 핸들러에 넘길 고정 컨텍스트.
  - `serviceContextFactory?: (request) => ServiceContext` — 요청별 컨텍스트 생성(고정 대신 요청마다 만들 때).
  - `handlers?: V1RequestHandler[]` — 커스텀 핸들러 체인.
  - `autoUpdateMethods?: V1AutoUpdateMethods` — 자동업데이트 fallback 고정 구현.
  - `autoUpdateMethodsFactory?: (ctx) => V1AutoUpdateMethods` — 요청별 fallback 생성.
  - `clientNameSetter?: (clientName) => void` — 메시지마다 clientName 통지 콜백.

## 사용 예

```ts
createServiceServer({
  // ...
  services: [AutoUpdateService], // ver≠2 연결의 getLastVersion fallback 자동 연결
  legacyV1Handlers: [
    (ctx) =>
      ctx.request.command === "Legacy.ping"
        ? { handled: true, body: "pong" }
        : { handled: false },
  ],
});
```

## 주의사항

- `handlers` 가 있는데 `serviceContext`(또는 factory)가 없으면 핸들러 실행 시 "serviceContext가 필요합니다." throw — 핸들러를 쓰려면 컨텍스트를 함께 제공.
- 메시지 처리 중 예외는 warn 로그만 남기고 응답하지 않음(레거시 한정 동작).
