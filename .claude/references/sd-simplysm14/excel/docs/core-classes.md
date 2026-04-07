# Core Classes

## `ExcelWorkbook`

Excel 워크북 처리 클래스. 내부적으로 ZIP 리소스를 관리하므로 사용 후 반드시 `close()`를 호출하거나 `await using`을 사용해야 한다.

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
  async [Symbol.asyncDispose](): Promise<void>;
}
```

### Constructor

| Parameter | Type | Description |
|-----------|------|-------------|
| `arg` | `Blob \| Bytes \| undefined` | 기존 Excel 파일 데이터. 생략하면 새 워크북을 생성한다 |

### Methods

#### `getWorksheetNames()`

워크북의 모든 워크시트 이름을 배열로 반환한다.

#### `addWorksheet(name)`

새 워크시트를 생성하여 `ExcelWorksheet` 인스턴스를 반환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | 워크시트 이름 |

#### `getWorksheet(nameOrIndex)`

이름 또는 0 기반 인덱스로 워크시트를 조회하여 반환한다. 찾을 수 없으면 에러를 던진다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `nameOrIndex` | `string \| number` | 워크시트 이름 또는 0 기반 인덱스 |

#### `toBytes()`

워크북을 `Bytes`(Uint8Array)로 내보낸다.

#### `toBlob()`

워크북을 `Blob`으로 내보낸다. MIME 타입은 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`이다.

#### `close()`

ZIP 리더와 내부 캐시를 정리한다. 이미 닫힌 워크북에 대해 호출해도 안전하다 (no-op). 닫힌 워크북의 메서드를 호출하면 에러가 발생한다.

#### `[Symbol.asyncDispose]()`

`await using` 구문을 지원한다. 내부적으로 `close()`를 호출한다.

---

## `ExcelWorksheet`

Excel 워크시트를 나타내는 클래스. 셀 접근, 행/열 복사, 데이터 테이블 처리, 이미지 삽입 기능을 제공한다.

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
  async getDataTable(opt?: { ... }): Promise<Record<string, ExcelValueType>[]>;
  async setDataMatrix(matrix: ExcelValueType[][]): Promise<void>;
  async setRecords(records: Record<string, ExcelValueType>[]): Promise<void>;

  // View
  async setZoom(percent: number): Promise<void>;
  async freezeAt(point: { r?: number; c?: number }): Promise<void>;

  // Image
  async addImage(opts: { ... }): Promise<void>;
}
```

### Name Methods

#### `getName()`

워크시트 이름을 반환한다.

#### `setName(newName)`

워크시트 이름을 변경한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `newName` | `string` | 새 워크시트 이름 |

### Cell Access Methods

모든 좌표는 0 기반 인덱스이다.

#### `row(r)`

행 객체를 반환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `r` | `number` | 행 인덱스 (0 기반) |

#### `cell(r, c)`

셀 객체를 반환한다. 동일 좌표에 대해 항상 동일한 `ExcelCell` 인스턴스를 반환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `r` | `number` | 행 인덱스 (0 기반) |
| `c` | `number` | 열 인덱스 (0 기반) |

#### `col(c)`

열 객체를 반환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `c` | `number` | 열 인덱스 (0 기반) |

### Copy Methods

#### `copyRowStyle(srcR, targetR)`

원본 행의 스타일을 대상 행으로 복사한다. 데이터 범위 내의 모든 열에 대해 셀 스타일을 복사한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `srcR` | `number` | 원본 행 인덱스 (0 기반) |
| `targetR` | `number` | 대상 행 인덱스 (0 기반) |

#### `copyCellStyle(srcAddr, targetAddr)`

원본 셀의 스타일을 대상 셀로 복사한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `srcAddr` | `ExcelAddressPoint` | 원본 셀 좌표 |
| `targetAddr` | `ExcelAddressPoint` | 대상 셀 좌표 |

#### `copyRow(srcR, targetR)`

원본 행을 대상 행으로 복사한다 (덮어쓰기).

| Parameter | Type | Description |
|-----------|------|-------------|
| `srcR` | `number` | 원본 행 인덱스 (0 기반) |
| `targetR` | `number` | 대상 행 인덱스 (0 기반) |

#### `copyCell(srcAddr, targetAddr)`

원본 셀을 대상 셀로 복사한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `srcAddr` | `ExcelAddressPoint` | 원본 셀 좌표 |
| `targetAddr` | `ExcelAddressPoint` | 대상 셀 좌표 |

#### `insertCopyRow(srcR, targetR)`

원본 행을 대상 위치에 삽입 복사한다. 대상 위치 이하의 기존 행은 한 칸 아래로 밀린다. 병합 셀도 자동으로 이동/확장된다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `srcR` | `number` | 복사할 원본 행 인덱스 (0 기반) |
| `targetR` | `number` | 삽입할 대상 행 인덱스 (0 기반) |

### Range Methods

#### `getRange()`

워크시트의 데이터 범위를 `ExcelAddressRangePoint`로 반환한다.

#### `getCells()`

모든 셀을 2차원 배열(`ExcelCell[][]`)로 반환한다.

### Data Methods

#### `getDataTable(opt?)`

워크시트 데이터를 테이블(레코드 배열)로 반환한다. 첫 번째 행(또는 `headerRowIndex`)을 헤더로 사용한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt.headerRowIndex` | `number \| undefined` | 헤더 행 인덱스 (기본값: 첫 번째 행) |
| `opt.checkEndColIndex` | `number \| undefined` | 데이터 끝을 판단할 열 인덱스. 이 열이 비어있으면 데이터가 끝난 것으로 판단한다 |
| `opt.usableHeaderNameFn` | `(headerName: string) => boolean \| undefined` | 사용 가능한 헤더를 필터링하는 함수 |

#### `setDataMatrix(matrix)`

2차원 배열 데이터를 워크시트에 쓴다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `matrix` | `ExcelValueType[][]` | 2차원 배열 데이터 (행 우선, 인덱스 0이 첫 번째 행) |

#### `setRecords(records)`

레코드 배열을 워크시트에 쓴다. 첫 번째 행에 헤더가 자동 생성되고, 이후 행에 데이터가 기록된다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `records` | `Record<string, ExcelValueType>[]` | 레코드 배열 |

### View Methods

#### `setZoom(percent)`

워크시트 확대/축소 비율을 설정한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `percent` | `number` | 확대/축소 퍼센트 |

#### `freezeAt(point)`

행/열 틀 고정을 설정한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `point.r` | `number \| undefined` | 고정할 행 인덱스 (0 기반) |
| `point.c` | `number \| undefined` | 고정할 열 인덱스 (0 기반) |

### Image Methods

#### `addImage(opts)`

워크시트에 이미지를 삽입한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `opts.bytes` | `Bytes` | 이미지 바이너리 데이터 |
| `opts.ext` | `string` | 이미지 확장자 (png, jpg 등) |
| `opts.from` | `{ r: number; c: number; rOff?: number \| string; cOff?: number \| string }` | 이미지 시작 위치 (0 기반 행/열 인덱스, rOff/cOff는 EMU 오프셋) |
| `opts.to` | `{ r: number; c: number; rOff?: number \| string; cOff?: number \| string } \| undefined` | 이미지 끝 위치 (생략 시 from 위치에서 1행x1열 크기) |

---

## `ExcelCell`

Excel 셀을 나타내는 클래스. 값 읽기/쓰기, 수식, 스타일, 셀 병합 기능을 제공한다. 모든 메서드가 `async`인 이유는 셀 타입에 따라 필요한 XML만 선택적으로 로드하는 Lazy Loading 아키텍처 때문이다.

```typescript
export class ExcelCell {
  readonly addr: ExcelAddressPoint;

  constructor(zipCache: ZipCache, targetFileName: string, r: number, c: number);

  // Value
  async setValue(val: ExcelValueType): Promise<void>;
  async getValue(): Promise<ExcelValueType>;
  async setFormula(val: string | undefined): Promise<void>;
  async getFormula(): Promise<string | undefined>;

  // Merge
  async merge(r: number, c: number): Promise<void>;

  // Style
  async getStyleId(): Promise<string | undefined>;
  async setStyleId(styleId: string | undefined): Promise<void>;
  async setStyle(opts: ExcelStyleOptions): Promise<void>;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `addr` | `ExcelAddressPoint` | 셀 주소 (0 기반 행/열 인덱스) |

### Value Methods

#### `setValue(val)`

셀 값을 설정한다. `undefined`를 전달하면 셀이 삭제된다. `DateOnly`, `DateTime`, `Time` 인스턴스를 전달하면 내부적으로 Excel 날짜 숫자로 변환하고 적절한 numFmt를 설정한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `val` | `ExcelValueType` | 셀 값 (`number \| string \| DateOnly \| DateTime \| Time \| boolean \| undefined`) |

#### `getValue()`

셀 값을 반환한다. 셀 타입과 스타일에 따라 적절한 JavaScript 타입으로 변환한다. 비어있는 셀은 `undefined`를 반환한다.

#### `setFormula(val)`

셀에 수식을 설정한다. `undefined`를 전달하면 수식이 제거된다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `val` | `string \| undefined` | 수식 문자열 (예: `"SUM(A1:A10)"`) |

#### `getFormula()`

셀 수식을 반환한다. 수식이 없으면 `undefined`를 반환한다.

### Merge Methods

#### `merge(r, c)`

현재 셀에서 지정된 끝 좌표까지 셀을 병합한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `r` | `number` | 병합 끝 행 인덱스 (0 기반) |
| `c` | `number` | 병합 끝 열 인덱스 (0 기반) |

### Style Methods

#### `getStyleId()`

셀의 스타일 ID를 반환한다. 스타일이 없으면 `undefined`를 반환한다.

#### `setStyleId(styleId)`

셀의 스타일 ID를 직접 설정한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `styleId` | `string \| undefined` | 스타일 ID |

#### `setStyle(opts)`

셀 스타일을 설정한다. 기존 스타일이 있으면 클론 후 병합한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `opts` | `ExcelStyleOptions` | 스타일 옵션 (배경색, 테두리, 정렬, 숫자 형식) |

---

## `ExcelRow`

Excel 워크시트의 행을 나타내는 클래스. 셀 접근 기능을 제공한다.

```typescript
export class ExcelRow {
  constructor(zipCache: ZipCache, targetFileName: string, r: number, cellFactory: (c: number) => ExcelCell);

  cell(c: number): ExcelCell;
  async getCells(): Promise<ExcelCell[]>;
}
```

### Methods

#### `cell(c)`

지정된 열 인덱스의 셀을 반환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `c` | `number` | 열 인덱스 (0 기반) |

#### `getCells()`

행의 모든 셀을 배열로 반환한다. 데이터 범위 내의 모든 열에 대한 셀이 포함된다.

---

## `ExcelCol`

Excel 워크시트의 열을 나타내는 클래스. 셀 접근 및 열 너비 설정 기능을 제공한다.

```typescript
export class ExcelCol {
  constructor(zipCache: ZipCache, targetFileName: string, c: number, cellFactory: (r: number) => ExcelCell);

  cell(r: number): ExcelCell;
  async getCells(): Promise<ExcelCell[]>;
  async setWidth(size: number): Promise<void>;
}
```

### Methods

#### `cell(r)`

지정된 행 인덱스의 셀을 반환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `r` | `number` | 행 인덱스 (0 기반) |

#### `getCells()`

열의 모든 셀을 배열로 반환한다. 데이터 범위 내의 모든 행에 대한 셀이 포함된다.

#### `setWidth(size)`

열 너비를 설정한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `size` | `number` | 열 너비 |
