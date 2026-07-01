# @simplysm/service-server — 서비스 작성

RPC로 노출할 서비스 정의, 요청 컨텍스트, 인증·권한 메타데이터, 클라이언트 공유용 메서드 타입을 만들 때 같이 읽는 묶음이다. 클라이언트 provider에 서비스 프록시를 연결하는 사용법: [client-service.md](../../manuals/client-service.md). 서비스 안에서 서버 이벤트를 발생시키는 사용법: [event.md](../../manuals/event.md).

## ServiceContext / createServiceContext

```ts
interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> };
  legacy?: { clientName?: string };
  get authInfo(): TAuthInfo | undefined;
  get clientName(): string | undefined;
  get clientPath(): string | undefined;
  getConfig<T>(section: string): Promise<T>;
}

function createServiceContext<TAuthInfo = unknown>(
  server: ServiceServer<TAuthInfo>,
  socket?: ServiceSocket,
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> },
  legacy?: { clientName?: string },
): ServiceContext<TAuthInfo>;
```

- `TAuthInfo = unknown` — 인증 토큰 `data` 타입. `authInfo` getter와 `AuthTokenPayload<TAuthInfo>`에 반영된다.
- `server: ServiceServer<TAuthInfo>` — 현재 서버 인스턴스. 서비스 메서드에서 토큰 서명·검증 또는 이벤트 발생에 쓴다.
- `socket?: ServiceSocket` — WebSocket 요청이면 전달되는 소켓 컨텍스트. `authInfo`·`clientName` 조회에서 HTTP보다 우선한다.
- `http?: { clientName; authTokenPayload? }` — HTTP 요청이면 전달되는 컨텍스트. `socket`이 없을 때 인증·클라이언트 이름 출처가 된다.
  - `http.clientName: string` — HTTP 요청 클라이언트 이름. `handleHttpRequest`가 `x-sd-client-name` 헤더에서 채운다.
  - `http.authTokenPayload?: AuthTokenPayload<TAuthInfo>` — HTTP Authorization 검증 결과. 없으면 비로그인 HTTP 요청으로 취급된다.
- `legacy?: { clientName?: string }` — V1 레거시 요청 컨텍스트. `socket`·`http`에 이름이 없을 때 `clientName` 출처가 된다.
  - `legacy.clientName?: string` — V1 요청 클라이언트 이름. `clientPath` 계산에 쓰일 수 있다.
- `authInfo: TAuthInfo | undefined` — `socket.authTokenPayload.data`를 먼저 보고, 없으면 `http.authTokenPayload.data`를 반환한다. 토큰이 없으면 `undefined`.
- `clientName: string | undefined` — `socket` → `http` → `legacy` 순서로 이름을 반환한다. 빈 문자열·`..`·`/`·`\\` 포함 값은 경로 안전성 오류로 throw한다.
- `clientPath: string | undefined` — `clientName`이 있으면 `server.options.rootPath/www/<clientName>` 절대경로, 없으면 `undefined`.
- `getConfig<T>(section): Promise<T>` — `rootPath/.config.json`과 `clientPath/.config.json`을 읽어 클라이언트 설정으로 병합(`obj.merge`)한 뒤 `section` 값을 반환한다. 섹션이 없으면 `"설정 섹션을 찾을 수 없습니다: ..."`를 throw한다.
  - `section: string` — 설정 JSON 최상위 키. 반환 타입 `T`는 호출자가 지정한다.

## auth / getServiceAuthPermissions

```ts
function auth<TFunction extends (...args: any[]) => any>(fn: TFunction): TFunction;
function auth<TFunction extends (...args: any[]) => any>(
  permissions: string[],
  fn: TFunction,
): TFunction;

function getServiceAuthPermissions(fn: Function): string[] | undefined;
```

- `auth(fn)` — 권한 배열 `[]`를 함수에 메타데이터로 붙인다. 실행기에서 "로그인 필요·역할 제한 없음"으로 해석된다.
- `auth(permissions, fn)` — `permissions` 배열을 메타데이터로 붙인다. 실행기에서 토큰 `roles` 중 하나라도 포함되어야 통과한다.
  - `permissions: string[]` — 요구 역할명 목록. 빈 배열이면 로그인만 요구한다.
  - `fn: TFunction` — 감쌀 서비스 팩토리 또는 메서드. wrapper는 인자를 그대로 전달해 결과를 반환한다(호출 시그니처 유지).
- 반환 `TFunction` — 권한 배열을 내부 심볼에 저장한 wrapper. 서비스 수준(`defineService(..., auth(factory))`)과 메서드 수준(`adminOnly: auth(["admin"], () => ...)`) 모두에 쓴다.
- `getServiceAuthPermissions(fn)` — `auth(...)` wrapper면 저장된 권한 배열을, 아니면 `undefined`를 반환한다.
  - `fn: Function` — 권한 메타데이터를 읽을 대상 함수. 팩토리·메서드 양쪽에 쓴다.
- 권한 적용 순서 — 실행기는 메서드 권한을 먼저 보고, 없으면 서비스 정의의 `authPermissions`를 쓴다.

## ServiceDefinition / defineService

```ts
interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  names: string[];
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}

function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string | string[],
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods>;
```

- `TMethods` — 서비스 메서드 객체 타입. 각 값은 RPC로 호출될 함수여야 한다.
- `name: string` — 단일 서비스 이름. 반환 정의의 `names`는 `[name]`, `name`이 대표 이름이 된다.
- `name: string[]` — 복수 이름/별칭. 첫 요소가 대표 `name`, 전체가 `names`가 된다. 빈 배열이면 `"서비스 이름은 하나 이상 필요합니다."`를 throw한다.
- `factory: (ctx: ServiceContext) => TMethods` — 요청 실행 시 컨텍스트를 받아 메서드 객체를 만드는 함수. `auth(factory)`로 감싸면 서비스 수준 권한이 된다.
- `ServiceDefinition.name: string` — 대표 서비스 이름(배열 입력이면 첫 이름).
- `ServiceDefinition.names: string[]` — 요청 라우팅에 쓰는 모든 이름. 실행기는 `names.includes(serviceName)`으로 찾는다.
- `ServiceDefinition.factory` — 요청마다 호출되어 메서드 객체를 반환한다.
- `ServiceDefinition.authPermissions?: string[]` — 서비스 수준 `auth` 메타데이터. `factory`가 `auth(...)` wrapper가 아니면 `undefined`.

## ServiceMethods

```ts
type ServiceMethods<TDefinition> = TDefinition extends ServiceDefinition<infer M> ? M : never;
```

- `TDefinition` — `defineService`로 만든 서비스 정의 타입.
- 반환 타입 — 정의에 담긴 메서드 객체 타입 `M`. 클라이언트 프록시 타입 공유용으로 `ServiceMethods<typeof SomeService>` 형태로 추출한다.
