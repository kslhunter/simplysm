# @simplysm/service-server — v1-legacy

`ver !== "2"`(구버전) WebSocket 클라이언트를 받기 위한 레거시 핸들러. 주로 구버전 앱의 자동 업데이트(`SdAutoUpdateService.getLastVersion`) 요청을 처리한다. `ServiceServer` 는 ver=2 가 아닌 연결을 자동으로 이 핸들러로 넘긴다(`AutoUpdate` 서비스나 `legacyV1Handlers` 가 있을 때만, 둘 다 없으면 연결 거부). `ServiceServerOptions.legacyV1Handlers` 로 커스텀 핸들러를 끼울 때만 직접 다룬다.

## handleV1Connection

V1 소켓 연결을 처리한다. 두 가지 시그니처:

- `handleV1Connection(socket, autoUpdateMethods: V1AutoUpdateMethods, clientNameSetter?)` — 자동 업데이트 메서드만 넘기는 단축형.
- `handleV1Connection(socket, options: V1ConnectionOptions)` — 전체 옵션형.

연결 즉시 `{ name: "connected" }` 전송. 메시지 수신 시: ① `clientNameSetter` 호출 → ② 사용자 `handlers` 순회(처리되면 그 응답) → ③ 미처리이고 command 가 `"SdAutoUpdateService.getLastVersion"` 이면 자동 업데이트 메서드 실행 → ④ 그래도 미처리면 `{ message: "앱 업그레이드가 필요합니다.", code: "UPGRADE_REQUIRED" }` 에러 응답. 메시지 파싱 에러는 warn 로그.

## V1ConnectionOptions

- `serviceContext?: ServiceContext` — 핸들러에 넘길 고정 컨텍스트.
- `serviceContextFactory?: (request: V1Request) => ServiceContext` — 요청별 컨텍스트 생성(고정 컨텍스트보다 우선 적용). `ServiceServer` 는 이걸로 clientName 만 담은 컨텍스트를 만든다.
- `handlers?: V1RequestHandler[]` — 사용자 정의 처리기 목록. 하나라도 `handled: true` 면 그 응답으로 종료. 핸들러가 있는데 컨텍스트가 없으면 throw.
- `autoUpdateMethods?: V1AutoUpdateMethods` — getLastVersion fallback 의 고정 구현.
- `autoUpdateMethodsFactory?: (ctx: V1RequestHandlerContext) => V1AutoUpdateMethods` — 요청별 fallback 생성(있으면 고정 구현보다 우선). 컨텍스트 없으면 throw.
- `clientNameSetter?: (clientName: string | undefined) => void` — 매 메시지의 `clientName` 을 외부로 전달하는 콜백.

## V1RequestHandler

`V1RequestHandler` — `(ctx: V1RequestHandlerContext) => V1RequestHandlerResult | Promise<...>`. 동기/비동기 모두 허용.

`V1RequestHandlerContext` — `{ request: V1Request; serviceContext: ServiceContext }`.

`V1RequestHandlerResult` — `{ handled: true; state?: "success" | "error"; body: unknown }`(이 핸들러가 처리; `state` 미지정 시 `"success"`) 또는 `{ handled: false }`(다음 핸들러/fallback 으로 위임).

## V1Request / V1Response

`V1Request` — 클라이언트 요청. `{ uuid: string; command: string; params: unknown[]; clientName?: string }`. `command` 는 `"<service>.<method>"` 형태.

`V1Response` — 서버 응답. `{ name: "response"; reqUuid: string; state: "success" | "error"; body: unknown }`. `state` 가 `"success"` 면 정상 결과, `"error"` 면 오류 본문.

## V1AutoUpdateMethods

`V1AutoUpdateMethods` — `{ getLastVersion: (platform: string) => Promise<unknown> | unknown }`. V1 자동 업데이트 fallback 의 최소 인터페이스. `ServiceServer` 는 등록된 `AutoUpdate` 서비스의 `getLastVersion` 을 여기에 어댑트해 넘긴다.
