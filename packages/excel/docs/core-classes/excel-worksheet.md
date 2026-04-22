# ExcelWorksheet

Excel 워크시트를 나타내는 클래스. 셀 접근, 행/열 복사, 데이터 테이블 처리, 이미지 삽입, 뷰 설정 기능을 제공한다.

```typescript
export class ExcelWorksheet {
  constructor(zipCache: ZipCache, relId: number, targetFileName: string);

  // Name
  async getName(): Promise<string>;
  async setName(newName: string): Promise<void>;

  // Cell Access (0 기반)
  row(r: number): ExcelRow;
  cell(r: number, c: number): ExcelCell;
  col(c: number): ExcelCol;

  // Copy
  async copyRowStyle(srcR: number, targetR: number): Promise<void>;
  async copyCellStyle(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void>;
  async copyRow(srcR: number, targetR: number): Promise<void>;
  async copyCell(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void>;
  async insertCopyRow(srcR: number, targetR: number): Promise<void>;

  // Range
  async getRange(): Promise<ExcelAddressRangePoint>;
  async getCells(): Promise<ExcelCell[][]>;

  // Data
  async getDataTable(opt?: {
    headerRowIndex?: number;
    checkEndColIndex?: number;
    usableHeaderNameFn?: (headerName: string) => boolean;
  }): Promise<Record<string, ExcelValueType>[]>;
  async setDataMatrix(matrix: ExcelValueType[][]): Promise<void>;
  async setRecords(records: Record<string, ExcelValueType>[]): Promise<void>;

  // View
  async setZoom(percent: number): Promise<void>;
  async freezeAt(point: { r?: number; c?: number }): Promise<void>;

  // Image
  async addImage(opts: {
    bytes: Bytes;
    ext: string;
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to?: { r: number; c: number; rOff?: number | string; cOff?: number | string };
  }): Promise<void>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `getName` | method | `() => Promise<string>` | 워크시트 이름 반환 |
| `setName` | method | `(newName: string) => Promise<void>` | 워크시트 이름 변경 |
| `row` | method | `(r: number) => ExcelRow` | 행 객체 반환 (0 기반) |
| `cell` | method | `(r: number, c: number) => ExcelCell` | 셀 객체 반환 (0 기반). 동일 좌표에 대해 항상 동일한 인스턴스 반환 |
| `col` | method | `(c: number) => ExcelCol` | 열 객체 반환 (0 기반) |
| `copyRowStyle` | method | `(srcR: number, targetR: number) => Promise<void>` | 원본 행의 스타일을 대상 행으로 복사. 데이터 범위 내 모든 열에 적용 |
| `copyCellStyle` | method | `(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint) => Promise<void>` | 원본 셀의 스타일을 대상 셀로 복사 |
| `copyRow` | method | `(srcR: number, targetR: number) => Promise<void>` | 원본 행을 대상 행으로 복사 (덮어쓰기) |
| `copyCell` | method | `(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint) => Promise<void>` | 원본 셀을 대상 셀로 복사 |
| `insertCopyRow` | method | `(srcR: number, targetR: number) => Promise<void>` | 원본 행을 대상 위치에 삽입 복사. 대상 이하 행은 한 칸 아래로 이동. 병합 셀 자동 처리 |
| `getRange` | method | `() => Promise<ExcelAddressRangePoint>` | 워크시트의 데이터 범위 반환 |
| `getCells` | method | `() => Promise<ExcelCell[][]>` | 모든 셀을 2차원 배열로 반환 |
| `getDataTable` | method | `(opt?) => Promise<Record<string, ExcelValueType>[]>` | 워크시트 데이터를 테이블(레코드 배열)로 반환 |
| `setDataMatrix` | method | `(matrix: ExcelValueType[][]) => Promise<void>` | 2차원 배열 데이터를 워크시트에 쓰기 |
| `setRecords` | method | `(records: Record<string, ExcelValueType>[]) => Promise<void>` | 레코드 배열을 워크시트에 쓰기. 첫 행에 헤더 자동 생성 |
| `setZoom` | method | `(percent: number) => Promise<void>` | 워크시트 확대/축소 비율 설정 (퍼센트) |
| `freezeAt` | method | `(point: { r?: number; c?: number }) => Promise<void>` | 행/열 틀 고정 설정 |
| `addImage` | method | `(opts) => Promise<void>` | 워크시트에 이미지 삽입 |

## `getDataTable` Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt.headerRowIndex` | `number \| undefined` | 헤더 행 인덱스 (기본값: 데이터 범위의 시작 행) |
| `opt.checkEndColIndex` | `number \| undefined` | 데이터 끝을 판단할 열 인덱스. 이 열이 비어있는 행을 만나면 읽기를 중단한다 |
| `opt.usableHeaderNameFn` | `((headerName: string) => boolean) \| undefined` | 헤더 필터 함수. `false` 반환 시 해당 헤더 제외 |

## `addImage` Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `opts.bytes` | `Bytes` | 이미지 바이너리 데이터 |
| `opts.ext` | `string` | 이미지 확장자 (예: `"png"`, `"jpg"`) |
| `opts.from` | `{ r: number; c: number; rOff?: number \| string; cOff?: number \| string }` | 이미지 시작 위치. `r`/`c`는 0 기반 인덱스, `rOff`/`cOff`는 선택적 EMU 오프셋 |
| `opts.to` | `{ r: number; c: number; rOff?: number \| string; cOff?: number \| string } \| undefined` | 이미지 끝 위치. 생략 시 기본값은 `{ r: from.r + 1, c: from.c + 1 }` |

## Usage

```typescript
// getDataTable
const table = await ws.getDataTable();
// [{ "이름": "김철수", "나이": 30 }, ...]

// 특정 행부터 시작하는 경우
const table2 = await ws.getDataTable({ headerRowIndex: 1 });

// 헤더 필터링
const table3 = await ws.getDataTable({
  usableHeaderNameFn: (name) => !name.startsWith("_"),
});

// 2차원 배열 쓰기
await ws.setDataMatrix([
  ["이름", "나이"],
  ["김철수", 30],
]);

// 레코드 배열 쓰기 (헤더 자동 생성)
await ws.setRecords([
  { name: "김철수", age: 30 },
]);

// 행 복사 (스타일 포함)
await ws.copyRow(0, 5);

// 삽입 복사 (기존 행 이동)
await ws.insertCopyRow(0, 3);

// 틀 고정 (2행부터 고정)
await ws.freezeAt({ r: 1, c: 0 });

// 이미지 삽입
await ws.addImage({
  bytes: imageBytes,
  ext: "png",
  from: { r: 1, c: 1 },
  to: { r: 5, c: 4 },
});
```

## `insertCopyRow` 병합 셀 처리

- 삽입 지점을 관통하는 다중행 병합은 자동으로 1행 확장됨
- 원본 행의 단일행 병합만 대상 행에 복사됨
