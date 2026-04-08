# Core

## `ServiceContext`

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

| Field | Type | Description |
|-------|------|-------------|
| `server` | `ServiceServer<TAuthInfo>` | 서버 인스턴스 참조 |
| `socket` | `ServiceSocket` (optional) | WebSocket 요청일 때만 존재하는 소켓 객체 |
| `http` | `{ clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> }` (optional) | HTTP 요청일 때만 존재 |
| `legacy` | `{ clientName?: string }` (optional) | V1 레거시 컨텍스트 (자동 업데이트 전용) |

| Accessor/Method | Return Type | Description |
|------------------|-------------|-------------|
| `authInfo` | `TAuthInfo \| undefined` | 토큰에서 추출한 사용자 데이터. WebSocket은 소켓의 `authTokenPayload.data`, HTTP는 헤더의 `authTokenPayload.data`에서 읽는다 |
| `clientName` | `string \| undefined` | 클라이언트 앱 이름. `..`, `/`, `\`를 포함하면 에러를 던진다 (경로 탐색 공격 방지) |
| `clientPath` | `string \| undefined` | `{rootPath}/www/{clientName}` 경로. `clientName`이 없으면 `undefined` |
| `getConfig<T>(section)` | `Promise<T>` | `.config.json`에서 섹션을 읽는다. 루트 설정을 먼저 읽고 클라이언트별 설정으로 덮어쓴다. 섹션이 없으면 에러를 던진다 |

## `createServiceContext`

`ServiceContext` 인스턴스를 생성한다.

```typescript
function createServiceContext<TAuthInfo = unknown>(
  server: ServiceServer<TAuthInfo>,
  socket?: ServiceSocket,
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> },
  legacy?: { clientName?: string },
): ServiceContext<TAuthInfo>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `server` | `ServiceServer<TAuthInfo>` | 서버 인스턴스 |
| `socket` | `ServiceSocket` (optional) | WebSocket 연결 (WebSocket 요청 시) |
| `http` | `{ clientName: string; authTokenPayload? }` (optional) | HTTP 요청 정보 |
| `legacy` | `{ clientName?: string }` (optional) | V1 레거시 컨텍스트 |

## `auth`

서비스 팩토리 또는 메서드에 인증을 요구하는 래퍼 함수. 래핑된 함수에 `AUTH_PERMISSIONS` 심볼로 권한 배열을 부착한다.

```typescript
function auth<TFunction extends (...args: any[]) => any>(fn: TFunction): TFunction;
function auth<TFunction extends (...args: any[]) => any>(
  permissions: string[],
  fn: TFunction,
): TFunction;
```

| Overload | Description |
|----------|-------------|
| `auth(fn)` | 로그인만 요구 (역할 검사 없음). 권한 배열은 `[]` |
| `auth(permissions, fn)` | 지정된 역할 중 하나를 가진 사용자만 허용 |

사용 위치:
- 서비스 수준: `defineService("Name", auth((ctx) => ({ ... })))` — 모든 메서드에 인증 적용
- 메서드 수준: `{ methodName: auth(() => result) }` — 해당 메서드만 인증 적용
- 메서드 수준이 서비스 수준보다 우선한다

## `getServiceAuthPermissions`

`auth()`로 래핑된 함수에서 인증 권한 배열을 읽는다. 래핑되지 않은 함수는 `undefined`를 반환한다.

```typescript
function getServiceAuthPermissions(fn: Function): string[] | undefined;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fn` | `Function` | 검사할 함수 |

## `ServiceDefinition`

서비스 정의 구조체.

```typescript
interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 서비스 이름. HTTP에서 `/api/{name}/{method}`, WebSocket에서 `{name}.{method}`로 라우팅된다 |
| `factory` | `(ctx: ServiceContext) => TMethods` | 요청마다 호출되는 팩토리 함수. 메서드 객체를 반환한다 |
| `authPermissions` | `string[]` (optional) | `auth()`로 래핑된 팩토리의 경우 서비스 수준 권한 배열 |

## `defineService`

이름과 팩토리 함수로 서비스를 정의한다. 팩토리가 `auth()`로 래핑되어 있으면 자동으로 `authPermissions`를 추출한다.

```typescript
function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string,
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | 서비스 이름 |
| `factory` | `(ctx: ServiceContext) => TMethods` | 메서드 객체를 반환하는 팩토리 함수 |

## `ServiceMethods`

`ServiceDefinition`에서 메서드 시그니처를 추출하는 유틸리티 타입. 클라이언트 측 타입 공유에 사용한다.

```typescript
type ServiceMethods<TDefinition> =
  TDefinition extends ServiceDefinition<infer M> ? M : never;
```

사용 예:

```typescript
export type UserServiceType = ServiceMethods<typeof UserService>;
```

## `executeServiceMethod`

서비스 조회 -> 컨텍스트 생성 -> 인증 확인 -> 메서드 실행 파이프라인을 수행한다.

```typescript
async function executeServiceMethod(
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

| Parameter | Type | Description |
|-----------|------|-------------|
| `server` | `ServiceServer` | 서버 인스턴스 |
| `def.serviceName` | `string` | 호출할 서비스 이름 |
| `def.methodName` | `string` | 호출할 메서드 이름 |
| `def.params` | `unknown[]` | 메서드 매개변수 배열 |
| `def.socket` | `ServiceSocket` (optional) | WebSocket 연결 (WebSocket 요청 시) |
| `def.http` | `{ clientName: string; authTokenPayload? }` (optional) | HTTP 요청 정보 |

인증 검사 로직:

1. 메서드 수준 `auth()` 권한이 있으면 이를 사용하고, 없으면 서비스 수준 `authPermissions`를 사용한다
2. 인증이 필요한데 `server.options.auth`가 `undefined`이면 설정 오류로 에러를 던진다
3. `server.options.auth`가 `false`이면 인증 검사를 스킵한다
4. 인증이 활성화되어 있으면 토큰 존재 여부를 확인하고, 역할 배열이 비어있지 않으면 역할 매칭을 수행한다
