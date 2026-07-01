# @simplysm/service-server — V1 레거시

`ver !== "2"` WebSocket 클라이언트를 처리하고, 구버전 자동업데이트 명령 또는 커스텀 레거시 요청 핸들러를 붙일 때 같이 읽는 묶음이다.

## V1Request / V1Response

```ts
interface V1Request {
  uuid: string;
  command: string;
  params: unknown[];
  clientName?: string;
}

interface V1Response {
  name: "response";
  reqUuid: string;
  state: "success" | "error";
  body: unknown;
}
```

- `V1Request.uuid: string` — 요청 식별자. 응답의 `reqUuid`로 되돌아간다.
- `V1Request.command: string` — 레거시 명령명. 자동업데이트 fallback은 `"SdAutoUpdateService.getLastVersion"`만 특별 처리한다.
- `V1Request.params: unknown[]` — 명령 인자 배열. 자동업데이트 fallback은 첫 요소를 `platform` 문자열로 넘긴다.
- `V1Request.clientName?: string` — 요청 클라이언트 이름. `clientNameSetter`와 레거시 `ServiceContext` 생성에 쓰인다.
- `V1Response.name: "response"` — 레거시 응답 메시지 종류 literal.
- `V1Response.reqUuid: string` — 원 요청 `uuid`.
- `V1Response.state: "success" | "error"` — 처리 상태. `"success"`는 정상 응답, `"error"`는 오류 body 응답이다.
- `V1Response.body: unknown` — 핸들러 결과, 자동업데이트 결과, 또는 업그레이드 필요 오류 객체.

## V1AutoUpdateMethods

```ts
interface V1AutoUpdateMethods {
  getLastVersion: (platform: string) => Promise<unknown> | unknown;
}
```

- `getLastVersion(platform)` — `SdAutoUpdateService.getLastVersion` 명령 fallback에서 호출되는 함수.
  - `platform: string` — V1 요청 `params[0]`에서 꺼내 전달되는 플랫폼 값.
  - 반환 `Promise<unknown> | unknown` — 결과가 `success` 응답 body로 전송된다.

## V1RequestHandlerResult / V1RequestHandlerContext / V1RequestHandler

```ts
type V1RequestHandlerResult =
  { handled: true; state?: V1Response["state"]; body: unknown } | { handled: false };

interface V1RequestHandlerContext {
  request: V1Request;
  serviceContext: ServiceContext;
}

type V1RequestHandler =
  | ((ctx: V1RequestHandlerContext) => Promise<V1RequestHandlerResult>)
  | ((ctx: V1RequestHandlerContext) => V1RequestHandlerResult);
```

- `handled: true` — 이 핸들러가 요청을 처리했음을 뜻한다. 이후 핸들러와 자동업데이트 fallback은 실행되지 않는다.
- `state?: "success" | "error"` — `handled: true` 응답 상태. 미지정 시 `"success"`로 전송된다.
- `body: unknown` — `handled: true` 응답 body.
- `handled: false` — 이 핸들러가 처리하지 않았음을 뜻한다. 다음 핸들러 또는 fallback으로 넘어간다.
- `request: V1Request` — 현재 레거시 요청 원문.
- `serviceContext: ServiceContext` — 핸들러가 쓸 서비스 컨텍스트. 핸들러가 있는데 컨텍스트가 없으면 실행 중 오류가 난다.
- `V1RequestHandler` — 동기 또는 비동기 핸들러 함수. 배열 순서대로 호출된다.

## V1ConnectionOptions

```ts
interface V1ConnectionOptions {
  serviceContext?: ServiceContext;
  serviceContextFactory?: (request: V1Request) => ServiceContext;
  handlers?: V1RequestHandler[];
  autoUpdateMethods?: V1AutoUpdateMethods;
  autoUpdateMethodsFactory?: (ctx: V1RequestHandlerContext) => V1AutoUpdateMethods;
  clientNameSetter?: (clientName: string | undefined) => void;
}
```

- `serviceContext?: ServiceContext` — 모든 요청에서 공유할 고정 컨텍스트.
- `serviceContextFactory?: (request) => ServiceContext` — 요청마다 컨텍스트를 만들 함수. 지정되면 `serviceContext`보다 우선한다. 요청별 `clientName`을 컨텍스트에 반영할 때 쓴다.
- `handlers?: V1RequestHandler[]` — 커스텀 요청 핸들러 목록. 첫 `handled: true`에서 순회가 멈춘다.
- `autoUpdateMethods?: V1AutoUpdateMethods` — 자동업데이트 fallback에 쓸 고정 구현.
- `autoUpdateMethodsFactory?: (ctx) => V1AutoUpdateMethods` — fallback 구현을 요청 컨텍스트로 만들 함수. 지정되면 `autoUpdateMethods` 대신 호출된다.
- `clientNameSetter?: (clientName) => void` — 각 메시지의 `clientName`을 외부 상태에 반영할 콜백.

## handleV1Connection

```ts
function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: V1AutoUpdateMethods,
  clientNameSetter?: (clientName: string | undefined) => void,
): void;
function handleV1Connection(socket: WebSocket, options: V1ConnectionOptions): void;
```

- `socket: WebSocket` — 레거시 연결 원시 소켓. 함수 호출 즉시 `{ name: "connected" }` JSON을 보낸다.
- `autoUpdateMethods: V1AutoUpdateMethods` — 첫 overload에서 자동업데이트 fallback 구현으로 쓰인다.
- `clientNameSetter?: (clientName) => void` — 첫 overload에서 요청별 `clientName` 통지에 쓰인다.
- `options: V1ConnectionOptions` — 핸들러·컨텍스트·fallback factory를 포함하는 상세 설정.
- overload 분기 — 두 번째 인자에 `getLastVersion` 키가 있으면 `V1AutoUpdateMethods`, 아니면 `V1ConnectionOptions`로 처리한다.
- 메시지 처리 순서 — JSON parse → `clientNameSetter` 호출 → serviceContext 선택(`serviceContextFactory?.(request)` 우선, 없으면 `serviceContext`) → custom handlers 실행 → `SdAutoUpdateService.getLastVersion` fallback → 미처리 오류 응답.
- custom handlers — `handlers ?? []`를 앞에서부터 호출한다. `handled: true`면 `state ?? "success"`와 `body`로 응답하고 종료한다.
- 자동업데이트 fallback — `command === "SdAutoUpdateService.getLastVersion"`일 때만 실행한다. `autoUpdateMethodsFactory`가 있으면 컨텍스트로 만들고, 없으면 `autoUpdateMethods`를 쓴다.
- 미처리 응답 — `state: "error"`, body `{ message: "앱 업그레이드가 필요합니다.", code: "UPGRADE_REQUIRED" }`를 보낸다.
- 예외 처리 — 메시지 파싱·처리 중 오류는 warn 로그만 남기고 응답을 보내지 않는다.
