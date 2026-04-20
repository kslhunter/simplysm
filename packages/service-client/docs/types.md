# Types

## `BlobInput`

Blob constructor가 허용하는 데이터 타입. DOM `BlobPart`를 대체하여 Node.js / 브라우저 양쪽에서 typecheck가 통과하도록 한다.

```typescript
export type BlobInput = Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string;
```

## `FileCollection`

File 컬렉션 인터페이스. DOM `FileList`를 대체하며 브라우저 `FileList`와 구조적으로 호환된다.

```typescript
export interface FileCollection {
  readonly length: number;
  item(index: number): File | null;
  [index: number]: File;
  [Symbol.iterator](): IterableIterator<File>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `length` | `number` | 파일 개수 |
| `item(index)` | `File \| null` | 인덱스로 File 반환 |
| `[index]` | `File` | 인덱스 접근자 |
| `[Symbol.iterator]()` | `IterableIterator<File>` | for-of 이터레이션 지원 |

## `isWorkerSupported`

Web Worker API 지원 여부를 확인한다. `globalThis.Worker` 존재 여부로 판별한다.

```typescript
export function isWorkerSupported(): boolean;
```

## `ServiceConnectionOptions`

서비스 서버에 연결할 때 사용하는 옵션 인터페이스.

```typescript
export interface ServiceConnectionOptions {
  port: number;
  host: string;
  ssl?: boolean;
  maxReconnectCount?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `port` | `number` | 서버 포트 번호 |
| `host` | `string` | 서버 호스트 주소 |
| `ssl` | `boolean?` | HTTPS/WSS 사용 여부 |
| `maxReconnectCount` | `number?` | 최대 재연결 횟수. `0`이면 재연결 비활성화. 기본값 `10` |

## `ServiceProgress`

요청/응답/서버 단계별 progress 콜백을 담는 컨테이너 인터페이스.

```typescript
export interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
  server?: (s: ServiceProgressState) => void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `request` | `((s: ServiceProgressState) => void)?` | 클라이언트 → 서버 전송 progress |
| `response` | `((s: ServiceProgressState) => void)?` | 서버 → 클라이언트 수신 progress |
| `server` | `((s: ServiceProgressState) => void)?` | 서버 내부 처리 progress |

## `ServiceProgressState`

progress 콜백에 전달되는 상태 객체.

```typescript
export interface ServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | `string` | 요청 식별자 |
| `totalSize` | `number` | 전체 크기 (bytes) |
| `completedSize` | `number` | 완료된 크기 (bytes) |
