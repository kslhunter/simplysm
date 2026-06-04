# @simplysm/service-server — 서비스 작성

RPC 로 노출할 서비스 메서드를 정의하고, 컨텍스트로 인증 정보·클라이언트 정보·설정에 접근하며, 인증·권한을 붙일 때 같이 읽는 묶음. 서버 옵션 `services` 에 등록할 `ServiceDefinition` 을 만드는 것이 목표.

## defineService

```ts
function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string | string[],
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods>
```

- `name: string | string[]` — 서비스 이름. 배열이면 여러 이름(별칭)으로 동시 노출하며 첫 요소가 대표 이름(`definition.name`). 빈 배열이면 throw. 클라이언트는 이 이름으로 `getService("<name>")` 호출. 신/구 이름을 같이 받으려면 `["New", "Old"]`.
- `factory: (ctx) => TMethods` — **요청마다 호출**되어 메서드 객체를 반환하는 팩토리. `ctx` 로 그 요청의 인증·클라이언트 정보가 들어오므로 메서드 안에서 `ctx.*` 를 자유롭게 참조. 요청 간 공유 상태(커넥션 풀 등)는 팩토리 바깥 모듈 스코프에 둘 것.
- 반환 `TMethods` 의 각 값은 클라이언트가 호출할 메서드. 동기·비동기 모두 가능하며 반환값이 그대로 응답으로 직렬화된다.

```ts
export const UserService = defineService("User", (ctx) => ({
  getProfile: auth(() => ctx.authInfo),
  echo: (msg: string) => `Echo: ${msg}`,
}));
export type UserServiceMethods = ServiceMethods<typeof UserService>;
```

## auth

서비스 팩토리 또는 개별 메서드를 인증 래퍼로 감싸 로그인·권한을 요구한다. 권한 메타데이터를 함수에 심볼로 부착하되 호출 동작은 그대로 보존하는 래퍼를 만든다.

```ts
function auth<TFn extends (...args: any[]) => any>(fn: TFn): TFn;
function auth<TFn extends (...args: any[]) => any>(permissions: string[], fn: TFn): TFn;
```

- `auth(fn)` — 로그인만 요구(권한 역할 무관). 토큰이 없으면 "로그인이 필요합니다." throw.
- `auth(permissions, fn)` — `permissions: string[]` 의 역할 중 하나라도 토큰 `roles` 에 있어야 통과. 없으면 "권한이 부족합니다." throw. 빈 배열은 `auth(fn)` 과 동일(로그인만).
- **서비스 수준**: `defineService("User", auth((ctx) => ({ ... })))` — 그 서비스의 모든 메서드에 적용. `defineService` 가 `authPermissions` 로 추출.
- **메서드 수준**: 반환 객체 안 개별 메서드를 `auth(...)` 로 감쌈. 메서드 수준 권한이 서비스 수준보다 우선.
- 적용 우선순위: 메서드 래핑 권한 → 없으면 서비스 권한. 서버 옵션 `auth` 가 `undefined` 면 권한 요구 메서드 호출 시 설정 오류 throw, `false` 면 인증 검사 자체를 스킵.

```ts
export const AdminService = defineService("Admin", auth((ctx) => ({
  list: () => fetchUsers(),                                  // 로그인만
  remove: auth(["admin"], (id: string) => deleteUser(id)),  // admin 역할 필요
})));
```

## ServiceContext

`factory` 가 요청마다 받는 컨텍스트. 메서드 안에서 인증·클라이언트·설정·서버에 접근하는 통로.

- `server: ServiceServer<TAuthInfo>` — 서버 인스턴스. `ctx.server.emitEvent(...)` 로 이벤트 발생, `ctx.server.signAuthToken(...)` 로 토큰 발급.
- `socket?: ServiceSocket` — WebSocket 요청일 때만 존재하는 소켓. HTTP 요청이면 `undefined`(소켓 필요한 기능은 존재 검사 필수).
- `http?: { clientName: string; authTokenPayload? }` — HTTP 요청일 때만 존재.
- `legacy?: { clientName? }` — V1 레거시 연결 컨텍스트(자동업데이트 전용).
- `get authInfo: TAuthInfo | undefined` — 검증된 토큰의 `data` 페이로드. 비로그인 요청이면 `undefined`(결측을 그대로 노출하므로 받는 쪽도 옵셔널로 다룰 것).
- `get clientName: string | undefined` — 요청 클라이언트 이름(소켓→HTTP→레거시 순 우선). 빈 문자열·`..`·슬래시(`/`,`\`) 포함 등 경로 탈출 위험 값이면 throw.
- `get clientPath: string | undefined` — `rootPath/www/<clientName>` 절대경로. clientName 없으면 `undefined`.
- `getConfig<T>(section: string): Promise<T>` — `rootPath/.config.json` 루트 설정에 클라이언트별 `www/<clientName>/.config.json` 을 머지한 뒤 `section` 키 값을 반환. 섹션이 없으면 throw. 설정 파일은 변경 시 자동 리로드(파일 워처 + 캐시).

```ts
export const ReportService = defineService("Report", auth((ctx) => ({
  mine: () => loadReports(ctx.authInfo!.userId),
  dbConfig: () => ctx.getConfig<DbConnConfig>("orm"),
})));
```

## ServiceDefinition / ServiceMethods / getServiceAuthPermissions

- `ServiceDefinition<TMethods>` — `defineService` 반환 타입. `{ name: string; names: string[]; factory: (ctx) => TMethods; authPermissions?: string[] }`. `names` 는 별칭 전체, `authPermissions` 는 서비스 수준 `auth` 권한(없으면 `undefined`).
- `type ServiceMethods<TDefinition>` — `ServiceDefinition<M>` 에서 메서드 시그니처 `M` 만 추출하는 타입 유틸. 클라이언트와 서비스 타입을 공유하려고 common 패키지에 `export type XxxServiceMethods = ServiceMethods<typeof XxxService>` 로 재노출하고, 클라이언트는 `client.getService<XxxServiceMethods>("Xxx")` 로 사용.
- `getServiceAuthPermissions(fn: Function): string[] | undefined` — `auth(...)` 로 래핑된 함수에서 권한 배열을 읽음. 래핑 안 됐으면 `undefined`. 내부 실행기·커스텀 전송에서만 필요(일반 작성에서는 불필요).

주의: 클라이언트가 쓰는 서비스 이름 문자열과 `ServiceMethods` 타입은 단일 소스(`defineService` 이름 / `typeof XxxService`)를 따른다. 호출부에서 이름·제네릭을 중복 정의하지 말 것.
