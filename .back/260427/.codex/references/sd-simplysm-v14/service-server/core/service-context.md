# `ServiceContext`

> **읽어야 하는 상황**: 서비스 팩토리에서 인증 정보, 클라이언트 경로, 설정 파일 등에 접근할 때. 전송 방식(WebSocket/HTTP)에 무관하게 동일한 인터페이스를 제공한다.

서비스 팩토리 함수에 전달되는 컨텍스트 인터페이스. 전송 방식(WebSocket/HTTP)에 무관하게 동일한 인터페이스를 제공한다.

```typescript
interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;
  http?: {
    clientName: string;
    authTokenPayload?: AuthTokenPayload<TAuthInfo>;
  };
  legacy?: {
    clientName?: string;
  };

  get authInfo(): TAuthInfo | undefined;
  get clientName(): string | undefined;
  get clientPath(): string | undefined;
  getConfig<T>(section: string): Promise<T>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `server` | property | `ServiceServer<TAuthInfo>` | 서버 인스턴스 참조 |
| `socket` | property | `ServiceSocket` (optional) | WebSocket 요청일 때만 존재하는 소켓 객체 |
| `http` | property | `{ clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> }` (optional) | HTTP 요청일 때만 존재 |
| `legacy` | property | `{ clientName?: string }` (optional) | V1 레거시 컨텍스트 (자동 업데이트 전용) |
| `authInfo` | getter | `TAuthInfo \| undefined` | 토큰에서 추출한 사용자 데이터. WebSocket은 소켓의 `authTokenPayload.data`, HTTP는 헤더의 `authTokenPayload.data`에서 읽는다 |
| `clientName` | getter | `string \| undefined` | 클라이언트 앱 이름. `..`, `/`, `\`를 포함하면 에러를 던진다 (경로 탐색 공격 방지) |
| `clientPath` | getter | `string \| undefined` | `{rootPath}/www/{clientName}` 경로. `clientName`이 없으면 `undefined` |
| `getConfig<T>(section)` | method | `Promise<T>` | `.config.json`에서 섹션을 읽는다. 루트 설정을 먼저 읽고 클라이언트별 설정으로 덮어쓴다. 섹션이 없으면 에러를 던진다 |

## Related Types

### `createServiceContext`

`ServiceContext` 인스턴스를 생성한다.

```typescript
function createServiceContext<TAuthInfo = unknown>(
  server: ServiceServer<TAuthInfo>,
  socket?: ServiceSocket,
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> },
  legacy?: { clientName?: string },
): ServiceContext<TAuthInfo>;
```

| Param | Type | Description |
|-------|------|-------------|
| `server` | `ServiceServer<TAuthInfo>` | 서버 인스턴스 |
| `socket` | `ServiceSocket` (optional) | WebSocket 연결 (WebSocket 요청 시) |
| `http` | `{ clientName: string; authTokenPayload? }` (optional) | HTTP 요청 정보 |
| `legacy` | `{ clientName?: string }` (optional) | V1 레거시 컨텍스트 |

## Usage

```typescript
const MyService = defineService("My", (ctx) => ({
  getProfile: () => {
    // 인증 정보 접근
    return ctx.authInfo;
  },

  readConfig: async () => {
    // 설정 파일 읽기
    const config = await ctx.getConfig<{ apiKey: string }>("myapp");
    return config.apiKey;
  },

  socketOnly: () => {
    if (ctx.socket == null) throw new Error("WebSocket만 허용");
    return ctx.socket.clientName;
  },
}));
```
