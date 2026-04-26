# `downloadBlob`

> **읽어야 하는 상황**: 메모리에서 생성한 데이터(엑셀, CSV, 바이너리 등)를 사용자 파일로 다운로드할 때. URL에서 파일을 먼저 가져와야 하면 [`fetchUrlBytes`](./fetch-url-bytes.md) 참조.

## When to use

- ✅ 메모리에서 생성한 데이터(엑셀, CSV, 바이너리 등)를 파일로 다운로드할 때
- ❌ URL에서 파일 다운로드 → [`fetchUrlBytes`](./fetch-url-bytes.md)로 먼저 가져온 후 사용하거나, `<a href>` 직접 사용

## Signature

```typescript
export function downloadBlob(blob: Blob, fileName: string): void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `blob` | `Blob` | 다운로드할 Blob 객체 |
| `fileName` | `string` | 저장할 파일명. 파일시스템 금지 문자(`/ \ : * ? " < > \|`), 제어문자, Windows 예약어(CON, PRN 등)는 `sanitize-filename`으로 자동 제거. 제거 후 빈 문자열이면 `"download"`로 대체 |

## Usage

### 최소 예제

```typescript
import { downloadBlob } from "@simplysm/core-browser";

const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
const blob = new Blob([data], { type: "application/octet-stream" });
downloadBlob(blob, "output.bin");
```

### 전형 예제 — JSON 데이터 다운로드

```typescript
import { downloadBlob } from "@simplysm/core-browser";

const jsonStr = JSON.stringify(exportData, null, 2);
const blob = new Blob([jsonStr], { type: "application/json" });
downloadBlob(blob, "export-data.json");
```

## 🚫 Anti-patterns

### Object URL 수동 해제

```typescript
// ❌ downloadBlob은 내부에서 1초 후 자동으로 URL.revokeObjectURL을 호출함
const url = URL.createObjectURL(blob);
downloadBlob(blob, "file.txt");
URL.revokeObjectURL(url); // 불필요한 중복 해제

// ✅ downloadBlob만 호출하면 됨
downloadBlob(blob, "file.txt");
```

**근거**: 내부에서 `setTimeout(() => URL.revokeObjectURL(url), 1000)`으로 자동 정리한다.
