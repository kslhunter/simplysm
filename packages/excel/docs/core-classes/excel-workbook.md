# ExcelWorkbook

Excel 워크북 처리 클래스. 내부적으로 ZIP 리소스를 관리하므로 사용 후 반드시 `try-finally` 블록에서 `close()`를 호출해야 한다.

대용량 Excel 파일의 메모리 효율을 위해 Lazy Loading 아키텍처를 채택한다. ZIP 내부의 XML은 접근 시점에만 읽고 파싱한다.

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

## Usage

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
