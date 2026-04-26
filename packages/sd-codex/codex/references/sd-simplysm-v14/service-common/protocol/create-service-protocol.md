# `createServiceProtocol`

> **읽어야 하는 상황**: WebSocket 메시지를 바이너리로 인코딩/디코딩하고, 대용량 메시지의 자동 청킹·재조립이 필요할 때. 프로토콜 설정 상수만 참조하려면 [`PROTOCOL_CONFIG`](./protocol-config.md) 참조.

## When to use

- 서비스 클라이언트·서버 간 WebSocket 통신에서 메시지를 바이너리 프레임으로 변환할 때
- 3MB 초과 메시지를 300KB 청크로 자동 분할·재조립이 필요할 때

ServiceProtocol 인스턴스를 생성하는 팩토리 함수.

```typescript
export function createServiceProtocol(): ServiceProtocol;
```

내부에 `LazyGcMap` 기반 청크 누적기를 캡슐화한다. 미완성 메시지는 60초 후 GC로 자동 정리된다. 사용 후 반드시 `dispose()`를 호출하여 GC 타이머를 해제해야 한다.

## Returns

`ServiceProtocol` — 인코딩/디코딩/해제 메서드를 포함한 프로토콜 인스턴스.

## Related Types

### `ServiceProtocol`

바이너리 프로토콜 V2 인코더/디코더 인터페이스.

```typescript
export interface ServiceProtocol {
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;
  dispose(): void;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `encode` | `uuid: string, message: ServiceMessage` | `{ chunks: Bytes[]; totalSize: number }` | 메시지를 인코딩한다. 3MB 초과 시 300KB 청크로 자동 분할. `totalSize` > 100MB이면 `ArgumentError` 발생 |
| `decode` | `bytes: Bytes` | `ServiceMessageDecodeResult<T>` | 청크를 디코딩한다. 청크가 모두 도착하면 `complete`, 아니면 `progress` 반환 |
| `dispose` | 없음 | `void` | 내부 GC 타이머와 청크 누적기를 해제한다. 사용 후 반드시 호출 |

헤더 구조 (28바이트, Big Endian):

| Offset | Size | Field |
|--------|------|-------|
| 0 | 16 | UUID (바이너리) |
| 16 | 8 | TotalSize (uint64, 상위 4바이트 = 0) |
| 24 | 4 | Index (uint32) |

### `ServiceMessageDecodeResult`

메시지 디코딩 결과 유니언 타입. `type` 필드로 분기한다.

```typescript
export type ServiceMessageDecodeResult<TMessage extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: TMessage }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

**Variant: `complete`** — 모든 청크가 도착하여 메시지 재조립이 완료된 상태.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"complete"` | discriminant |
| `uuid` | `string` | 메시지 UUID |
| `message` | `TMessage` | 재조립된 메시지 |

**Variant: `progress`** — 청크 메시지 수신 진행 중.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"progress"` | discriminant |
| `uuid` | `string` | 메시지 UUID |
| `totalSize` | `number` | 전체 크기 (바이트) |
| `completedSize` | `number` | 수신 완료된 크기 (바이트) |

## Usage

```typescript
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();

// 메시지 인코딩 (3MB 초과 시 자동 청킹)
const { chunks, totalSize } = protocol.encode(uuid, {
  name: "OrmService.connect",
  body: [{ configName: "default" }],
});

// 메시지 디코딩 (청크 자동 재조립)
for (const chunk of chunks) {
  const result = protocol.decode(chunk);
  if (result.type === "complete") {
    // result.message: 재조립된 메시지
  }
}

// 사용 후 반드시 해제
protocol.dispose();
```
