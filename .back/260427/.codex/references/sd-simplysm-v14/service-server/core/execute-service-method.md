# `executeServiceMethod`

> **읽어야 하는 상황**: 커스텀 전송 계층에서 서비스 실행 파이프라인을 직접 호출할 때. 일반적인 서버 사용 시에는 `ServiceServer`가 내부적으로 호출하므로 직접 사용할 필요가 없다.

서비스 조회 → 컨텍스트 생성 → 인증 확인 → 메서드 실행 파이프라인을 수행한다.

## When to use

- ✅ 커스텀 전송 계층에서 서비스 실행 파이프라인을 직접 호출할 때
- ❌ 일반적인 서버 사용 시에는 `ServiceServer`가 내부적으로 호출하므로 직접 사용할 필요가 없다

```typescript
async function executeServiceMethod(
  server: ServiceServer,
  def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
    http?: { clientName: string; authTokenPayload?: AuthTokenPayload };
  },
): Promise<unknown>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `server` | `ServiceServer` | 서버 인스턴스 |
| `def.serviceName` | `string` | 호출할 서비스 이름. `ServiceDefinition.names` 중 하나와 일치하면 실행된다 |
| `def.methodName` | `string` | 호출할 메서드 이름 |
| `def.params` | `unknown[]` | 메서드 매개변수 배열 |
| `def.socket` | `ServiceSocket` (optional) | WebSocket 연결 (WebSocket 요청 시) |
| `def.http` | `{ clientName: string; authTokenPayload? }` (optional) | HTTP 요청 정보 |

## Returns

`Promise<unknown>` — 메서드 실행 결과.

인증 검사 로직:

1. 메서드 수준 `auth()` 권한이 있으면 이를 사용하고, 없으면 서비스 수준 `authPermissions`를 사용한다
2. 인증이 필요한데 `server.options.auth`가 `undefined`이면 설정 오류로 에러를 던진다
3. `server.options.auth`가 `false`이면 인증 검사를 스킵한다
4. 인증이 활성화되어 있으면 토큰 존재 여부를 확인하고, 역할 배열이 비어있지 않으면 역할 매칭을 수행한다
