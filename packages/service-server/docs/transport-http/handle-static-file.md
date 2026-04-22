# handleStaticFile

정적 파일 서빙을 처리한다. 경로 탐색 공격 방지와 숨김 파일 접근 차단이 포함되어 있다.

```typescript
async function handleStaticFile(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  urlPath: string,
): Promise<void>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
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
