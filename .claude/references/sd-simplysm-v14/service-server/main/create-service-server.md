# createServiceServer

`ServiceServer` 인스턴스를 생성하는 팩토리 함수.

```typescript
function createServiceServer<TAuthInfo = unknown>(
  options: ServiceServerOptions,
): ServiceServer<TAuthInfo>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `options` | [`ServiceServerOptions`](../types/service-server-options.md) | 서버 설정 옵션 |

## Returns

`ServiceServer<TAuthInfo>` — 생성된 서버 인스턴스. `listen()`을 호출해야 실제로 시작된다.

## Usage

```typescript
const server = createServiceServer<MyAuthInfo>({
  rootPath: "/app",
  port: 3000,
  auth: { jwtSecret: "secret" },
  services: [UserService, OrmService],
});

await server.listen();
```
