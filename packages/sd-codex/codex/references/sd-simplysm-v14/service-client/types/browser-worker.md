# `BrowserWorker`

> **읽어야 하는 상황**: Worker 인터페이스의 cross-env 타입 호환이 필요할 때. `ClientProtocolWrapper`가 내부적으로 사용하며, 직접 사용은 드물다.

```typescript
export interface BrowserWorker {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  postMessage(message: unknown, transfer?: unknown[]): void;
  terminate(): void;
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `onmessage` | `((event: MessageEvent) => void) \| null` | 메시지 수신 핸들러 |
| `onerror` | `((event: Event) => void) \| null` | 에러 핸들러 |
| `postMessage(message, transfer?)` | `void` | Worker에 메시지 전송 |
| `terminate()` | `void` | Worker 종료 |

## Related Functions

### `isBrowserWorkerSupported`

DOM Worker API 지원 여부를 확인한다. `"Worker" in globalThis`로 판별한다.

```typescript
export function isBrowserWorkerSupported(): boolean;
```

### `isNodeWorkerSupported`

Node.js `worker_threads` 지원 여부를 확인한다. `process.versions.node` 존재 여부로 판별한다.

```typescript
export function isNodeWorkerSupported(): boolean;
```

### `isWorkerSupported`

Worker 오프로딩 지원 여부를 확인한다. `isBrowserWorkerSupported() || isNodeWorkerSupported()`를 반환한다.

```typescript
export function isWorkerSupported(): boolean;
```
