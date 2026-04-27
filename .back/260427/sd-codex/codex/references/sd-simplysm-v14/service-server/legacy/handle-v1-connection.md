# `handleV1Connection`

> **읽어야 하는 상황**: V1 WebSocket 프로토콜과의 호환이 필요할 때. 자동 업데이트 전 구형 클라이언트 요청을 사용자 핸들러로 처리하거나, 기존 자동 업데이트(`SdAutoUpdateService.getLastVersion`) fallback을 유지해야 할 때.

V1 레거시 WebSocket 프로토콜 호환 레이어. 사용자 핸들러 체인을 먼저 실행하고, 처리되지 않은 요청은 자동 업데이트(`SdAutoUpdateService.getLastVersion`) fallback 또는 업그레이드 필요 에러로 처리한다.

```typescript
function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: V1AutoUpdateMethods,
  clientNameSetter?: (clientName: string | undefined) => void,
): void;

function handleV1Connection(socket: WebSocket, options: V1ConnectionOptions): void;

interface V1ConnectionOptions {
  serviceContext?: ServiceContext;
  serviceContextFactory?: (request: V1Request) => ServiceContext;
  handlers?: V1RequestHandler[];
  autoUpdateMethods?: V1AutoUpdateMethods;
  autoUpdateMethodsFactory?: (ctx: V1RequestHandlerContext) => V1AutoUpdateMethods;
  clientNameSetter?: (clientName: string | undefined) => void;
}

type V1RequestHandler = (
  ctx: V1RequestHandlerContext,
) => Promise<V1RequestHandlerResult> | V1RequestHandlerResult;

interface V1RequestHandlerContext {
  request: V1Request;
  serviceContext: ServiceContext;
}

type V1RequestHandlerResult =
  | { handled: true; state?: "success" | "error"; body: unknown }
  | { handled: false };
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `socket` | `WebSocket` | 기저 WebSocket 인스턴스 |
| `autoUpdateMethods` | `V1AutoUpdateMethods` | AutoUpdateService의 V1 fallback 메서드 객체 |
| `options.handlers` | `V1RequestHandler[]` (optional) | AutoUpdate fallback 전에 순서대로 실행할 사용자 핸들러 |
| `options.serviceContext` | `ServiceContext` (optional) | 사용자 핸들러에 전달할 서비스 컨텍스트. `handlers`가 있으면 필요하다 |
| `options.serviceContextFactory` | `(request: V1Request) => ServiceContext` (optional) | V1 요청별 서비스 컨텍스트를 생성한다. 요청별 `clientName` 또는 `clientPath`가 필요하면 이 옵션을 사용한다 |
| `options.autoUpdateMethodsFactory` | `(ctx: V1RequestHandlerContext) => V1AutoUpdateMethods` (optional) | 자동 업데이트 fallback 메서드를 요청별 서비스 컨텍스트로 생성한다 |
| `clientNameSetter` | `(clientName: string \| undefined) => void` (optional) | V1 요청의 `clientName`을 레거시 컨텍스트에 설정하는 콜백 |

V1 프로토콜:
- 연결 시 `{ name: "connected" }` 메시지를 전송한다
- 요청 형식: `{ uuid: string; command: string; params: unknown[]; clientName?: string }`
- 응답 형식: `{ name: "response"; reqUuid: string; state: "success" | "error"; body: unknown }`
- 사용자 핸들러가 `{ handled: true, body }`를 반환하면 해당 body로 성공 응답을 보낸다
- 사용자 핸들러가 모두 `{ handled: false }`를 반환하면 `"SdAutoUpdateService.getLastVersion"` fallback을 시도한다
- fallback도 처리하지 못하면 `UPGRADE_REQUIRED` 에러를 반환한다

동시에 여러 V1 메시지를 처리할 수 있으므로, 요청의 `clientName`에 의존하는 핸들러는 공유 `serviceContext`보다 `serviceContextFactory`를 사용한다. `ServiceServerOptions.legacyV1Handlers` 경로는 내부적으로 요청별 컨텍스트를 생성한다.
