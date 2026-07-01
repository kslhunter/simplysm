# @simplysm/service-server

Fastify 기반 서비스 서버 패키지. `ServiceDefinition`을 HTTP/WebSocket RPC로 실행하고 JWT 인증, 이벤트 발생, 정적 파일·업로드, 내장 ORM·자동업데이트, V1 레거시 연결을 제공한다.

## 사용 트리거 인덱스

- **서버 부트스트랩** — `ServiceServerOptions`로 서버를 구성하고 `ServiceServer`를 기동·종료하거나 서버에서 이벤트를 발생시킬 때. 자세히: [server.md](./server.md)
- **서비스 작성** — `defineService` 팩토리, `ServiceContext`, `auth` 권한 메타, 클라이언트 공유용 `ServiceMethods` 타입을 만들 때. 자세히: [service-authoring.md](./service-authoring.md)
- **JWT 인증 토큰** — 로그인 토큰 페이로드를 만들고 `signJwt`/`verifyJwt`/`decodeJwt`를 직접 호출할 때.
- **내장 서비스** — 기본 제공 `OrmService`와 `AutoUpdateService`를 서버 `services`에 등록하거나 메서드 타입을 공유할 때. 자세히: [built-in-services.md](./built-in-services.md)
- **전송 계층 내부** — 커스텀 전송·테스트·디버깅에서 실행기, HTTP/WS/업로드/정적 파일 핸들러, 프로토콜 래퍼를 직접 다룰 때. 자세히: [transport-internals.md](./transport-internals.md)
- **V1 레거시** — `ver !== "2"` WebSocket 클라이언트의 자동업데이트 fallback 또는 커스텀 레거시 핸들러를 붙일 때. 자세히: [v1-legacy.md](./v1-legacy.md)

## JWT 인증 토큰

로그인 처리에서 토큰을 직접 서명·검증·디코드할 때 쓰는 저수준 함수 묶음이다. 서버 인스턴스의 시크릿을 쓰는 경우는 [server.md](./server.md)의 `ServiceServer.signAuthToken`/`verifyAuthToken`을 우선 본다.

### AuthTokenPayload

```ts
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];
  data: TAuthInfo;
}
```

- `TAuthInfo = unknown` — 앱이 토큰 `data`에 싣는 인증 정보 타입. `ServiceServer<TAuthInfo>`·`ServiceContext.authInfo`와 같은 타입 축으로 쓰인다.
- `roles: string[]` — 권한 역할 목록. `auth([role], ...)` 실행 시 요구 역할 중 하나라도 포함되는지 검사된다.
- `data: TAuthInfo` — 앱 인증 정보 본문. 검증된 요청에서는 `ctx.authInfo`로 노출된다.
- `JWTPayload` 확장 — `jose` 페이로드 필드와 함께 쓰인다. `signJwt`는 `iat`와 `exp`를 설정한다.

### signJwt

```ts
function signJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  payload: AuthTokenPayload<TAuthInfo>,
  expiresHours?: number,
): Promise<string>;
```

- `jwtSecret: string` — `TextEncoder`로 바이트화해 HS256 서명 키로 사용한다.
- `payload: AuthTokenPayload<TAuthInfo>` — 서명할 JWT 본문. `roles`와 `data`가 이후 인증·권한 검사 입력이 된다.
- `expiresHours: number = 12` — 만료 시간(시간 단위). 생략 시 `12`; 지정 시 `exp - iat`가 해당 시간으로 설정된다.
- 반환 `Promise<string>` — `jose.SignJWT`가 만든 서명 토큰 문자열.

### verifyJwt

```ts
function verifyJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  token: string,
): Promise<AuthTokenPayload<TAuthInfo>>;
```

- `jwtSecret: string` — HS256 검증 키로 사용할 문자열.
- `token: string` — 검증할 JWT 문자열.
- 반환 `AuthTokenPayload<TAuthInfo>` — 검증된 페이로드를 이 타입으로 반환한다.
- 오류 — `ERR_JWT_EXPIRED`이면 `"토큰이 만료되었습니다."`, 그 외 검증 실패는 `"유효하지 않은 토큰입니다."`로 throw한다.

### decodeJwt

```ts
function decodeJwt<TAuthInfo = unknown>(token: string): AuthTokenPayload<TAuthInfo>;
```

- `token: string` — 디코드할 JWT 문자열.
- 반환 `AuthTokenPayload<TAuthInfo>` — 서명 검증 없이 `jose.decodeJwt` 결과를 반환 타입에 맞춰 노출한다.
