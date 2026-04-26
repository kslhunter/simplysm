# `handleHttpRequest`

> **읽어야 하는 상황**: HTTP API 요청(`/api/:service/:method`) 처리 동작을 이해할 때. `ServiceServer`가 내부적으로 사용한다.

GET/POST `/api/:service/:method` 경로의 HTTP 요청을 처리한다. `x-sd-client-name` 헤더가 필수이며, `Authorization` 헤더가 있으면 JWT 토큰을 검증한다.

```typescript
async function handleHttpRequest<TAuthInfo = unknown>(
  req: FastifyRequest,
  reply: FastifyReply,
  jwtSecret: string | undefined,
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    http: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> };
  }) => Promise<unknown>,
): Promise<void>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `req` | `FastifyRequest` | Fastify 요청 객체 |
| `reply` | `FastifyReply` | Fastify 응답 객체 |
| `jwtSecret` | `string \| undefined` | JWT 시크릿. `Authorization` 헤더가 있는데 시크릿이 없으면 에러를 던진다 |
| `runMethod` | `(def) => Promise<unknown>` | 서비스 메서드 실행 콜백 |

요청 매개변수 파싱:
- **GET**: `?json=` 쿼리 파라미터에서 JSON 배열을 파싱한다
- **POST**: 요청 본문이 JSON 배열이어야 한다. 배열이 아니면 400을 반환한다
- **그 외**: 405 Method Not Allowed를 반환한다

인증 실패 시 401 응답을 반환한다.
