# Transport - HTTP

## `handleHttpRequest`

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

| Parameter | Type | Description |
|-----------|------|-------------|
| `req` | `FastifyRequest` | Fastify 요청 객체 |
| `reply` | `FastifyReply` | Fastify 응답 객체 |
| `jwtSecret` | `string \| undefined` | JWT 시크릿. `Authorization` 헤더가 있는데 시크릿이 없으면 에러를 던진다 |
| `runMethod` | `(def) => Promise<unknown>` | 서비스 메서드 실행 콜백 |

요청 매개변수 파싱:
- **GET**: `?json=` 쿼리 파라미터에서 JSON 배열을 파싱한다
- **POST**: 요청 본문이 JSON 배열이어야 한다. 배열이 아니면 400을 반환한다
- **그 외**: 405 Method Not Allowed를 반환한다

인증 실패 시 401 응답을 반환한다.

## `handleUpload`

`/upload` 경로의 multipart 파일 업로드를 처리한다. 인증 필수 (Authorization 헤더 필수).

```typescript
async function handleUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  jwtSecret: string | undefined,
): Promise<void>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `req` | `FastifyRequest` | Fastify 요청 객체 |
| `reply` | `FastifyReply` | Fastify 응답 객체 |
| `rootPath` | `string` | 서버 루트 경로. 파일은 `{rootPath}/www/uploads/`에 저장된다 |
| `jwtSecret` | `string \| undefined` | JWT 시크릿 |

동작:
- 파일명은 UUID로 변환되고 원래 확장자를 유지한다
- 파일 크기 제한 초과 시 에러를 던진다
- 에러 발생 시 불완전한 파일과 이미 저장된 파일을 모두 정리한다

응답: `ServiceUploadResult[]` (from `@simplysm/service-common`)

```typescript
// ServiceUploadResult 구조
{ path: "uploads/{uuid}.ext", filename: "원본파일명.ext", size: number }
```

## `handleStaticFile`

정적 파일 서빙을 처리한다. 경로 탐색 공격 방지와 숨김 파일 접근 차단이 포함되어 있다.

```typescript
async function handleStaticFile(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  urlPath: string,
): Promise<void>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `req` | `FastifyRequest` | Fastify 요청 객체 |
| `reply` | `FastifyReply` | Fastify 응답 객체 |
| `rootPath` | `string` | 서버 루트 경로. `{rootPath}/www/` 하위에서 파일을 찾는다 |
| `urlPath` | `string` | 요청 URL 경로 (슬래시 제거됨) |

보안 처리:
- `{rootPath}/www/` 외부 경로 접근 시 에러를 던진다 (경로 탐색 공격 방지)
- `.`으로 시작하는 파일은 403 Forbidden을 반환한다

디렉토리 처리:
- 디렉토리 요청 시 끝에 슬래시가 없으면 슬래시를 추가하여 리다이렉트한다
- 디렉토리에 대해 `index.html`을 자동으로 서빙한다
