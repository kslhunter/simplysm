# `transfer`

> **읽어야 하는 상황**: Worker 간에 DateTime/Uuid 등 커스텀 타입을 포함한 데이터를 전송할 때. JSON 문자열 직렬화는 [`json`](./json.md) 참조.

Worker 간 전송 가능한 객체 변환 유틸리티 네임스페이스. `structuredClone`이 지원하지 않는 커스텀 타입을 처리한다.

```typescript
import { transfer } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `encode` | `(obj) => { result: unknown; transferList: ArrayBuffer[] }` | Simplysm 타입을 포함한 객체를 Worker 전송 가능한 형태로 변환. 순환 참조 시 `TypeError` 발생 |
| `decode` | `(obj) => unknown` | `encode()`로 변환된 객체를 원래 Simplysm 타입으로 복원 |

## 지원 타입

`Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `RegExp`, `Error` (cause, code, detail 포함), `Uint8Array`, `Array`, `Map`, `Set`, 일반 객체

`Uint8Array`는 zero-copy 전송을 위해 `ArrayBuffer`를 `transferList`에 추가한다. `SharedArrayBuffer`는 이미 공유 메모리이므로 `transferList`에 추가하지 않는다.

## Usage

```typescript
import { transfer } from "@simplysm/core-common";

// Worker로 데이터 전송
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);

// Worker에서 데이터 수신
self.onmessage = (event) => {
  const decoded = transfer.decode(event.data);
};
```
