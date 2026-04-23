# `IndexedDbVirtualFs`

`IndexedDbStore` 위에 경로 기반 가상 파일시스템을 구현하는 클래스. 키는 `/path/to/file` 형태의 문자열이다.

## When to use

- ✅ 브라우저에서 파일/디렉토리 계층 구조를 IndexedDB에 저장할 때
- ✅ 오프라인 캐시나 가상 파일시스템이 필요할 때
- ❌ 단순 키-값 저장 → [`IndexedDbStore`](./indexed-db-store.md)로 충분
- ❌ 실제 파일시스템 접근 → File System Access API 또는 서버 측 처리

## Signature

```typescript
export class IndexedDbVirtualFs {
  constructor(db: IndexedDbStore, storeName: string, keyField: string)

  getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>
  putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>
  deleteByPrefix(keyPrefix: string): Promise<boolean>
  listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>
  ensureDir(fullKeyBuilder: (path: string) => string, dirPath: string): Promise<void>
}
```

## Members

| Member | Kind | Description |
|--------|------|-------------|
| `constructor` | method | `IndexedDbStore` 인스턴스, 스토어 이름, 키 필드명을 주입받음 |
| `getEntry` | method | 경로에 해당하는 엔트리 조회. 없으면 `undefined` |
| `putEntry` | method | 엔트리 추가/갱신. `kind`는 `"file"` 또는 `"dir"`. 파일이면 `dataBase64`에 Base64 데이터 전달 |
| `deleteByPrefix` | method | 접두사와 일치하는 모든 엔트리 삭제. 삭제된 항목이 있으면 `true` 반환 |
| `listChildren` | method | 접두사 바로 아래 자식 목록 반환. 직접 자식만 (재귀적이지 않음) |
| `ensureDir` | method | 경로의 모든 중간 디렉토리를 재귀적으로 생성. 이미 있으면 건너뜀 |

## Usage

### 최소 예제

```typescript
import { IndexedDbStore, IndexedDbVirtualFs } from "@simplysm/core-browser";

const store = new IndexedDbStore("fsDb", 1, [{ name: "files", keyPath: "path" }]);
const fs = new IndexedDbVirtualFs(store, "files", "path");

await fs.putEntry("/readme.txt", "file", btoa("Hello"));
const entry = await fs.getEntry("/readme.txt");
// entry?.kind === "file", entry?.dataBase64 === "SGVsbG8="

store.close();
```

### 전형 예제 — 디렉토리 구조 관리

```typescript
import { IndexedDbStore, IndexedDbVirtualFs } from "@simplysm/core-browser";

const store = new IndexedDbStore("appFs", 1, [{ name: "vfs", keyPath: "fullPath" }]);
const fs = new IndexedDbVirtualFs(store, "vfs", "fullPath");

// 중간 디렉토리 자동 생성 (/, /docs 모두 생성됨)
// fullKeyBuilder는 키를 가공하는 함수 (접두사 추가 등)
await fs.ensureDir((p) => p, "/docs/reports");

// 파일 저장
await fs.putEntry("/docs/reports/q1.pdf", "file", base64Data);

// 자식 목록 조회 (직접 자식만)
const children = await fs.listChildren("/docs/");
// [{ name: "reports", isDirectory: true }]

// 접두사로 일괄 삭제
const deleted = await fs.deleteByPrefix("/docs/reports");
// deleted === true

store.close();
```

## 🚫 Anti-patterns

### ensureDir 없이 중간 경로의 파일 저장

```typescript
// ❌ /docs 디렉토리 엔트리가 없으면 listChildren("/")에서 /docs가 나타나지 않을 수 있음
await fs.putEntry("/docs/file.txt", "file", data);

// ✅ 중간 디렉토리를 먼저 생성
await fs.ensureDir((p) => p, "/docs");
await fs.putEntry("/docs/file.txt", "file", data);
```

**근거**: `putEntry`는 해당 경로의 엔트리만 저장하고 부모 디렉토리를 자동 생성하지 않는다. `listChildren`이 정확한 결과를 반환하려면 중간 디렉토리 엔트리가 존재해야 한다.

### prefix에 후행 슬래시 누락

```typescript
// ❌ "/docs"로 listChildren하면 "/docsExtra" 같은 형제도 포함될 수 있음
const children = await fs.listChildren("/docs");

// ✅ 후행 슬래시를 포함하여 정확한 디렉토리 자식만 조회
const children = await fs.listChildren("/docs/");
```

**근거**: `listChildren`은 `key.startsWith(prefix)` 후 첫 번째 `/` 세그먼트를 기준으로 자식을 추출한다. 후행 슬래시가 없으면 접두사가 같은 다른 경로가 포함될 수 있다.

## Related Types

### `VirtualFsEntry`

```typescript
export interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `"file" \| "dir"` | 엔트리 종류 |
| `dataBase64` | `string \| undefined` | 파일 데이터 (Base64 인코딩). 디렉토리인 경우 `undefined` |
