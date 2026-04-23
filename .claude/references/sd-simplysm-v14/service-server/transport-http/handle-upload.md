# handleUpload

`/upload` 경로의 multipart 파일 업로드를 처리한다. 인증 필수 (Authorization 헤더 필수).

```typescript
async function handleUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  jwtSecret: string | undefined,
): Promise<void>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
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
