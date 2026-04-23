# FileCollection

File 컬렉션 인터페이스. DOM `FileList`를 대체하며 브라우저 `FileList`와 구조적으로 호환된다.

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
