# `handleV1Connection`

> **읽어야 하는 상황**: V1 WebSocket 프로토콜과의 호환이 필요할 때. 자동 업데이트(`SdAutoUpdateService.getLastVersion`)만 지원하고, 그 외 모든 요청은 업그레이드 필요 에러를 반환한다.

V1 레거시 WebSocket 프로토콜 호환 레이어. 자동 업데이트(`SdAutoUpdateService.getLastVersion`)만 지원하고, 그 외 모든 요청은 업그레이드 필요 에러를 반환한다.

```typescript
function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: { getLastVersion: (platform: string) => Promise<any> },
  clientNameSetter?: (clientName: string | undefined) => void,
): void;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `socket` | `WebSocket` | 기저 WebSocket 인스턴스 |
| `autoUpdateMethods` | `{ getLastVersion: (platform: string) => Promise<any> }` | AutoUpdateService의 메서드 객체 |
| `clientNameSetter` | `(clientName: string \| undefined) => void` (optional) | V1 요청의 `clientName`을 레거시 컨텍스트에 설정하는 콜백 |

V1 프로토콜:
- 연결 시 `{ name: "connected" }` 메시지를 전송한다
- 요청 형식: `{ uuid: string; command: string; params: unknown[]; clientName?: string }`
- 응답 형식: `{ name: "response"; reqUuid: string; state: "success" | "error"; body: unknown }`
- `command`가 `"SdAutoUpdateService.getLastVersion"`이면 처리하고, 그 외는 `UPGRADE_REQUIRED` 에러를 반환한다
