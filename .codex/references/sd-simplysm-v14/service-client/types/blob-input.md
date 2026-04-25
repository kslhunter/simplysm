# `BlobInput`

> **읽어야 하는 상황**: 파일 업로드 시 데이터 타입(`Blob`, `Uint8Array`, `ArrayBuffer`, `string`)을 지정할 때. `FileClient.upload()`의 `{ name, data }` 객체에서 `data` 필드 타입으로 사용된다.

```typescript
export type BlobInput = Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string;
```
