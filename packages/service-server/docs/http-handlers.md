# HTTP Handlers

## `handleHttpRequest`

Handles HTTP RPC requests. Supports both GET (with JSON query parameter) and POST (with JSON array body) methods.

```typescript
export async function handleHttpRequest<TAuthInfo = unknown>(
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
| `req` | `FastifyRequest` | Fastify request (expects `/:service/:method` route params) |
| `reply` | `FastifyReply` | Fastify reply |
| `jwtSecret` | `string \| undefined` | JWT secret for token verification |
| `runMethod` | callback | Service method executor |

Request requirements:
- Header `x-sd-client-name` is required
- GET: requires `?json=<encoded-params>` query parameter
- POST: requires JSON array body
- Authorization header (optional): `Bearer <token>`

## `handleUpload`

Handles multipart file uploads. Saves files to `{rootPath}/www/uploads/` with UUID-based filenames.

```typescript
export async function handleUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  jwtSecret: string | undefined,
): Promise<void>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `req` | `FastifyRequest` | Fastify multipart request |
| `reply` | `FastifyReply` | Fastify reply |
| `rootPath` | `string` | Server root path |
| `jwtSecret` | `string \| undefined` | JWT secret for authentication |

Behavior:
- Requires multipart request and valid Authorization header
- Saves each file with a UUID filename preserving the original extension
- Returns `ServiceUploadResult[]` on success
- Cleans up all files on error (both partially written and already saved)

## `handleStaticFile`

Serves static files from `{rootPath}/www/` with security guards.

```typescript
export async function handleStaticFile(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  urlPath: string,
): Promise<void>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `req` | `FastifyRequest` | Fastify request |
| `reply` | `FastifyReply` | Fastify reply |
| `rootPath` | `string` | Server root path |
| `urlPath` | `string` | Decoded URL path (without leading slash) |

Security:
- Path traversal attack prevention (rejects paths outside `{rootPath}/www/`)
- Hidden file access denied (files starting with `.` return 403)
- Directory requests redirect to add trailing slash, then serve `index.html`
