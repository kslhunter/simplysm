# `ExcelWorkbook`

> **읽어야 하는 상황**: xlsx 파일을 새로 만들거나 기존 파일을 열어 수정·저장할 때. Zod 스키마 기반 타입 안전한 읽기/쓰기는 [`ExcelWrapper`](../wrapper/excel-wrapper.md) 참조.

Excel 워크북 처리 클래스. 내부적으로 ZIP 리소스를 관리하므로 사용 후 반드시 `try-finally` 블록에서 `close()`를 호출해야 한다.

대용량 Excel 파일의 메모리 효율을 위해 Lazy Loading 아키텍처를 채택한다. ZIP 내부의 XML은 접근 시점에만 읽고 파싱한다.

## When to use

- ✅ xlsx 파일을 새로 생성하거나 기존 파일을 읽고 수정할 때
- ✅ 워크시트를 추가/조회하고 결과를 바이트 배열이나 Blob으로 내보낼 때
- ❌ Zod 스키마 기반 타입 안전한 읽기/쓰기가 필요하면 [`ExcelWrapper`](../wrapper/excel-wrapper.md) -- 내부적으로 `ExcelWorkbook`을 사용하므로 직접 관리할 필요 없음

## Signature

```typescript
export class ExcelWorkbook {
  readonly zipCache: ZipCache;

  constructor(arg?: Blob | Bytes);

  async getWorksheetNames(): Promise<string[]>;
  async addWorksheet(name: string): Promise<ExcelWorksheet>;
  async getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet>;
  async toBytes(): Promise<Bytes>;
  async toBlob(): Promise<Blob>;
  async close(): Promise<void>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `zipCache` | property | `ZipCache` | ZIP 캐시 인스턴스 (read-only) |
| `constructor` | method | `(arg?: Blob \| Bytes) => ExcelWorkbook` | `arg` 생략 시 새 워크북 생성, 전달 시 기존 파일 읽기 |
| `getWorksheetNames` | method | `() => Promise<string[]>` | 워크북의 모든 워크시트 이름 반환 |
| `addWorksheet` | method | `(name: string) => Promise<ExcelWorksheet>` | 새 워크시트 생성하여 반환 |
| `getWorksheet` | method | `(nameOrIndex: string \| number) => Promise<ExcelWorksheet>` | 이름 또는 0 기반 인덱스로 워크시트 조회. 찾을 수 없으면 에러 발생 |
| `toBytes` | method | `() => Promise<Bytes>` | 워크북을 `Bytes`(Uint8Array)로 내보내기 |
| `toBlob` | method | `() => Promise<Blob>` | 워크북을 `Blob`으로 내보내기. MIME 타입: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `close` | method | `() => Promise<void>` | ZIP 리더와 내부 캐시 정리. 이미 닫힌 워크북에 대해 호출해도 안전하다 (no-op). 닫힌 후 메서드 호출 시 에러 발생 |

## 🚫 Anti-patterns

### close() 누락

```typescript
// ❌ close() 없이 사용 -- ZIP 리소스 누수
const wb = new ExcelWorkbook(bytes);
const ws = await wb.getWorksheet(0);

// ✅ try-finally로 반드시 close()
const wb = new ExcelWorkbook(bytes);
try {
  const ws = await wb.getWorksheet(0);
} finally {
  await wb.close();
}
```

**근거**: `ExcelWorkbook`은 내부적으로 ZIP 아카이브를 보유하며, `close()` 없이 방치하면 메모리 누수가 발생한다.

## Usage

### 최소 예제

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// 신규 생성
const wb = new ExcelWorkbook();
try {
  const ws = await wb.addWorksheet("Sheet1");
  await ws.cell(0, 0).setValue("값");
  const bytes = await wb.toBytes();
} finally {
  await wb.close();
}

```

### 기존 파일 읽기

```typescript
// 기존 파일 읽기 (Uint8Array 또는 Blob)
const wb2 = new ExcelWorkbook(bytes);
try {
  const ws = await wb2.getWorksheet(0);       // 0 기반 인덱스
  const ws2 = await wb2.getWorksheet("Sheet1"); // 시트명으로도 조회 가능
  const names = await wb2.getWorksheetNames();
} finally {
  await wb2.close();
}
```
