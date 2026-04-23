# BlobInput

Blob constructor가 허용하는 데이터 타입. DOM `BlobPart`를 대체하여 Node.js / 브라우저 양쪽에서 typecheck가 통과하도록 한다.

```typescript
export type BlobInput = Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string;
```
