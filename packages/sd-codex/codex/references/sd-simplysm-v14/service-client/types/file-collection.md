# `FileCollection`

> **읽어야 하는 상황**: DOM `FileList` 호환 타입이 필요할 때. `FileClient.upload()` 및 `ServiceClient.uploadFile()`의 `files` 파라미터에서 사용된다.

```typescript
export interface FileCollection {
  readonly length: number;
  item(index: number): File | null;
  [index: number]: File;
  [Symbol.iterator](): IterableIterator<File>;
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `length` | `number` | 파일 개수 (읽기 전용) |
| `item(index)` | `File \| null` | 인덱스로 File 반환 |
| `[index]` | `File` | 인덱스 접근자 |
| `[Symbol.iterator]()` | `IterableIterator<File>` | for-of 이터레이션 지원 |
