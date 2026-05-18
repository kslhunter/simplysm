# @simplysm/service-server — auth

JWT 페이로드 타입 및 서명/검증 유틸. 일반 시나리오에서는 `server.signAuthToken` / `server.verifyAuthToken` 이 동일 알고리즘으로 감싸므로 그쪽을 쓴다. 이 모듈을 직접 import 하는 경우는 토큰 발급/검증을 서버 인스턴스 없이 수행해야 할 때 (테스트, 별도 인증 서비스, 디코드 등).

## `AuthTokenPayload<TAuthInfo>`

```ts
interface AuthTokenPayload<TAuthInfo = unknown> extends jose.JWTPayload {
  roles: string[];                 // auth(["role"], fn) 검사 대상
  data: TAuthInfo;                 // ctx.authInfo 로 노출
}
```

## `signJwt(jwtSecret, payload) → Promise<string>`

HS256, `iat` 자동, 만료 `12h` 고정. 토큰 수명을 바꿔야 하면 이 함수 대신 직접 `jose.SignJWT` 를 쓴다.

## `verifyJwt<TAuthInfo>(jwtSecret, token) → Promise<AuthTokenPayload<TAuthInfo>>`

검증 실패 시 `토큰이 만료되었습니다.` 또는 `유효하지 않은 토큰입니다.` 를 throw.

## `decodeJwt<TAuthInfo>(token) → AuthTokenPayload<TAuthInfo>`

서명 검증 없이 페이로드만 디코드. 클라이언트 측 만료 표시 등 비보안 용도에만.

## 예제

```ts
const token = await signJwt(secret, { roles: ["admin"], data: { userId: "U1" } });
const payload = await verifyJwt<{ userId: string }>(secret, token);
```
