# `ClientProtocolWrapper`

메시지 인코딩/디코딩 인터페이스. 데이터 크기가 30KB 이상이면 Web Worker로 처리를 오프로드한다. 팩토리 함수 `createClientProtocolWrapper`로 생성한다.

## When to use

- ✅ 메시지 인코딩/디코딩을 직접 제어하거나 Worker 오프로드 동작을 커스터마이징할 때
- ❌ 일반적으로 `ServiceClient`가 내부적으로 생성·관리한다. 직접 생성은 커스텀 전송 계층 구현 시에만 필요하다.

```typescript
export interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `encode(uuid, message)` | method | `Promise<{ chunks: Bytes[]; totalSize: number }>` | 메시지를 바이너리 청크로 인코딩. 큰 데이터는 Worker로 오프로드 |
| `decode(bytes)` | method | `Promise<ServiceMessageDecodeResult<ServiceMessage>>` | 바이너리를 메시지로 디코딩. 큰 데이터는 Worker로 오프로드 (zero-copy 전송) |
| `dispose()` | method | `void` | 내부 `ServiceProtocol`과 Worker resolver 맵 정리 |

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
- Worker가 지원되지 않는 환경에서는 메인 스레드에서 처리
- Worker는 모듈 스코프 싱글턴으로 공유됨 (`createClientProtocolWrapper` 여러 번 호출해도 Worker는 하나)
- Worker 작업은 60초 타임아웃 후 자동 reject (메모리 누수 방지)
- `decode` 시 Worker로 `ArrayBuffer` 소유권 이전 (zero-copy)

**Worker 생성 패턴 제약:**

Worker 생성 시 반드시 `new Worker(new URL("...", import.meta.url))` 직접 패턴을 사용해야 한다. sd-cli의 esbuild Worker 번들링 플러그인(`sd-worker-bundle`)이 AST에서 이 패턴만 인식하여 Worker 파일을 별도 번들로 분리한다. 래퍼 함수로 감싸면 플러그인이 인식하지 못하고 브라우저에서 404 에러가 발생한다.

## Usage

```typescript
import { createClientProtocolWrapper } from "@simplysm/service-client";
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();
const wrapper = createClientProtocolWrapper(protocol);

const { chunks, totalSize } = await wrapper.encode("uuid-1", { name: "User.getList", body: [] });
// chunks: Bytes[] — 전송할 청크 배열
// totalSize: number — 전체 크기 (progress 표시용)

// 사용 완료 후 반드시 정리
wrapper.dispose();
```
