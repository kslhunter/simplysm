# Protocol

## `ClientProtocolWrapper`

메시지 인코딩/디코딩 인터페이스. 데이터 크기가 30KB 이상이면 Web Worker로 처리를 오프로드한다.

```typescript
export interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `encode(uuid, message)` | `Promise<{ chunks: Bytes[]; totalSize: number }>` | 메시지를 바이너리 청크로 인코딩. 큰 데이터는 Worker로 오프로드 |
| `decode(bytes)` | `Promise<ServiceMessageDecodeResult<ServiceMessage>>` | 바이너리를 메시지로 디코딩. 큰 데이터는 Worker로 오프로드 (zero-copy 전송) |
| `dispose()` | `void` | 내부 `ServiceProtocol`과 Worker resolver 맵 정리 |

## `createClientProtocolWrapper`

`ClientProtocolWrapper` 팩토리 함수.

```typescript
export function createClientProtocolWrapper(protocol: ServiceProtocol): ClientProtocolWrapper;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `protocol` | `ServiceProtocol` | `@simplysm/service-common`의 `createServiceProtocol()`로 생성한 프로토콜 인스턴스 |

내부 동작:
- 임계값: 30KB (`30 * 1024` bytes)
- Worker가 지원되지 않는 환경(Node.js)에서는 메인 스레드에서 처리
- Worker는 싱글턴 패턴으로 공유됨 (`createClientProtocolWrapper` 여러 번 호출해도 Worker는 하나)
- Worker 작업은 60초 타임아웃 후 자동 reject (메모리 누수 방지)
- `decode` 시 Worker로 `ArrayBuffer` 소유권 이전 (zero-copy), 결과에서 `DateTime` 등 클래스 인스턴스 복원

사용 예:

```typescript
import { createClientProtocolWrapper } from "@simplysm/service-client";
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();
const wrapper = createClientProtocolWrapper(protocol);

const { chunks, totalSize } = await wrapper.encode("uuid-1", { name: "User.getList", body: [] });

// 사용 완료 후 정리
wrapper.dispose();
```
