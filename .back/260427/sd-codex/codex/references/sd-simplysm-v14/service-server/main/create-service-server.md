# `createServiceServer`

> **읽어야 하는 상황**: `new ServiceServer()` 대신 팩토리 함수로 서버 인스턴스를 생성할 때. 서버의 전체 API는 [`ServiceServer`](./service-server.md) 참조.

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
