# @simplysm/excel — ExcelWorkbook / ExcelWorksheet / ExcelRow / ExcelCol

워크북 생성, 로드, 시트 추가, 조회, 이름 변경, 시트 단위 데이터 읽기, 쓰기, 복사, 행/열 보기 설정, 이미지 삽입, 행/열 핸들 접근을 한 작업 흐름에서 다루는 클래스.
개별 셀 값, 수식, 스타일은 [cell.md](./cell.md) 참조.

`ExcelWorkbook`, `ExcelWorksheet`, `ExcelRow`, `ExcelCol` 의 대부분 메서드는 `async`.
ZIP 내 XML/BIFF 파트를 접근 시점에만 lazy-load 하여 필요한 파트만 로드하는 설계이기 때문.

## ExcelWorkbook

```typescript
class ExcelWorkbook {
  readonly zipCache: ZipCache;
  constructor(arg?: Blob | Bytes | { format?: "xlsx" | "xlsb" });
  getWorksheetNames(): Promise<string[]>;
  addWorksheet(name: string): Promise<ExcelWorksheet>;
  getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet>;
  setDefaultStyle(opts: ExcelStyleOptions): Promise<void>;
  toBytes(): Promise<Bytes>;
  toBlob(): Promise<Blob>;
  close(): Promise<void>;
}
```

**생성자**

- `arg: undefined` — 빈 새 워크북 생성. 기본 포맷 `"xlsx"` (새 ContentTypes/rels/workbook/workbook-rels 생성).
- `arg: Blob | Bytes` — 기존 Excel 파일 데이터로 워크북 로드. ZIP 내 `xl/workbook.bin` 존재 여부로 포맷 판별(`"xlsx"` 또는 `"xlsb"`).
- `arg.format: "xlsx" | "xlsb"` — 새 워크북 생성 시 컨테이너 포맷 명시. `"xlsx"` 는 OOXML XML 파트, `"xlsb"` 는 BIFF12 이진 파트로 골격 등록.

**메서드**

- `getWorksheetNames(): Promise<string[]>` — 워크북에 등록된 시트 이름 배열 반환. `close()` 이후 호출하면 throw.
- `addWorksheet(name: string): Promise<ExcelWorksheet>` — 새 시트 추가.
  이름이 sanitize 되고(금지 문자 제거, 전부 제거되면 `"Sheet"` 로 대체), relId/sheetId 자동 증가,
  빈 worksheet 파트 포맷별 등록. `close()` 이후 호출하면 throw.
- `getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet>` — 시트명 또는 0 기반 인덱스로 조회 후 `ExcelWorksheet` 반환.
  같은 관계 ID 재호출 시 캐시된 인스턴스 반환. 없으면 throw. `close()` 이후 호출하면 throw.
- `setDefaultStyle(opts: ExcelStyleOptions): Promise<void>` — 워크북 default cell style 설정.
  `xl/styles.xml` 의 0번 자원 슬롯(fonts[0]/fills[0]/borders[0])과 cellXfs[0].xf[0] 을 입력 옵션으로 덮어씀.
  셀 xf 가 자원 id 명시하지 않으면 0번 슬롯이 자동 fallback 되므로 "표준" 스타일이 워크북 전역 적용.
  미호출 시 원본 슬롯 보존. `close()` 이후 호출하면 throw.
- `toBytes(): Promise<Bytes>` — 캐시된 모델 파트를 직렬화하고 ZIP 압축 결과를 `Bytes` 로 반환. `close()` 이후 호출하면 throw.
- `toBlob(): Promise<Blob>` — `toBytes()` 결과를 MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` Blob 으로 감쌈. `close()` 이후 호출하면 throw.
- `close(): Promise<void>` — ZIP 리더와 내부 시트 캐시 정리. 이미 닫힌 상태면 no-op.

**리소스 관리**

`ExcelWorkbook` 은 내부 ZIP 리소스 보유. 사용 후 반드시 `close()` 호출 필요.

## ExcelWorksheet

```typescript
class ExcelWorksheet {
  getName(): Promise<string>;
  setName(newName: string): Promise<void>;
  row(r: number): ExcelRow;
  cell(r: number, c: number): ExcelCell;
  col(c: number): ExcelCol;
  copyRowStyle(srcR: number, targetR: number): Promise<void>;
  copyCellStyle(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void>;
  copyRow(srcR: number, targetR: number): Promise<void>;
  copyCell(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void>;
  insertCopyRow(srcR: number, targetR: number): Promise<void>;
  getRange(): Promise<ExcelAddressRangePoint>;
  getCells(): Promise<ExcelCell[][]>;
  getDataTable(opt?: {
    headerRowIndex?: number;
    checkEndColIndex?: number;
    usableHeaderNameFn?: (headerName: string) => boolean;
  }): Promise<Record<string, ExcelValueType>[]>;
  setDataMatrix(matrix: ExcelValueType[][]): Promise<void>;
  setRecords(records: Record<string, ExcelValueType>[]): Promise<void>;
  setTabColor(color: string): Promise<void>;
  setZoom(percent: number): Promise<void>;
  freezeAt(point: { r?: number; c?: number }): Promise<void>;
  setAutoFilter(range: ExcelAddressRangePoint): Promise<void>;
  addConditionalFormat(opts: { ref: string; rules: ExcelConditionalRule[] }): Promise<void>;
  addImage(opts: {
    bytes: Bytes;
    ext: string;
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to?: { r: number; c: number; rOff?: number | string; cOff?: number | string };
  }): Promise<void>;
}
```

**메서드**

- `getName() / setName(newName: string)` — workbook 파트의 관계 ID에 매핑된 시트명 읽기/쓰기. 관계 ID 없으면 throw.
- `row(r: number) / cell(r: number, c: number) / col(c: number)` — 0 기반 행/셀/열 핸들 동기 반환. 내부 Map 에 캐시.
- `copyRowStyle(srcR, targetR)` — 현재 데이터 범위의 모든 열에 대해 원본 행 셀의 styleId 만 대상 행에 복사. 원본 styleId 없는 셀은 대상 미수정.
- `copyCellStyle(srcAddr, targetAddr)` — 원본 셀 styleId 있으면 대상 셀에 같은 styleId 지정.
- `copyRow(srcR, targetR) / copyCell(srcAddr, targetAddr)` — 원본 행/셀을 대상 위치로 복제(덮어쓰기). 값, 타입, 스타일, 수식, 병합 모두 복사.
- `insertCopyRow(srcR, targetR)` — `targetR` 이상 행을 아래로 한 칸 밀고 원본 행을 대상에 복사.
  삽입 지점 이하 병합은 이동, 삽입 지점 관통 다중행 병합은 1행 확장, 원본 단일행 병합은 대상 행에도 복사.
  `srcR >= targetR` 이면 밀린 원본 위치 보정.
- `getRange()` — 데이터 존재 범위를 `{ s, e }` 좌표로 반환.
- `getCells()` — 데이터 범위의 각 행 셀을 모아 2차원 배열 반환.
- `getDataTable(opt)` — 헤더 행(기본 첫 행)의 문자열 셀을 key 로 삼고, 이후 행을 `Record<string, ExcelValueType>` 배열로 변환. 중복 헤더면 throw. 옵션:
  - `headerRowIndex: number` — 헤더 행 인덱스(기본: 데이터 범위 시작 행).
  - `checkEndColIndex: number` — 데이터 종료 판정 열. 해당 열 값이 null/undefined 이면 반복 중단.
  - `usableHeaderNameFn: (name: string) => boolean` — 헤더 문자열 채택 필터. false 면 결과 record 에서 제외.
- `setDataMatrix(matrix: ExcelValueType[][])` — 행, 열 인덱스 0부터 matrix 값 기록. 행 우선 순서. `undefined` 는 셀 삭제.
- `setRecords(records: Record<string, ExcelValueType>[])` — 모든 record 의 key distinct 목록을 0행 헤더로 쓰고 1행부터 데이터 기록. 빈 문자열 key 제외.
- `setTabColor(color: string)` — worksheet `sheetPr.tabColor.rgb` 설정. ARGB 8자리(예: `"00FF0000"`).
- `setZoom(percent: number)` — workbook view 골격 보장 후 worksheet `zoomScale` 설정. 단위: 퍼센트.
- `freezeAt(point: { r?, c? })` — workbook view 골격 보장 후 worksheet pane 을 frozen 으로 설정.
  `r` = 틀 고정할 마지막 행, `c` = 마지막 열. 둘 다, 하나만, 없음 조합에 따라 고정 영역 결정.
- `setAutoFilter(range: ExcelAddressRangePoint)` — worksheet `autoFilter.ref` 를 범위 A1 문자열로 설정. 헤더행-데이터 끝 전체 범위 지정 권장.
- `addConditionalFormat(opts)` — 셀/범위에 조건부 서식 규칙 배열 적용. 규칙별 dxf 를 styles 파트에 등록, worksheet `conditionalFormatting` 블록 누적. 옵션:
  - `ref: string` — 단일 셀(`"A1"`) 또는 범위(`"A1:B10"`) Excel 주소.
  - `rules: ExcelConditionalRule[]` — 규칙 배열. 배열 순서가 priority(앞이 우선). 호출 간에는 시트 전역 카운터로 이어붙음.
- `addImage(opts)` — 워크시트에 이미지 삽입. media 파일, [Content_Types].xml, worksheet rels, drawing, drawing rels 생성 또는 재사용. 옵션:
  - `bytes: Bytes` — 이미지 바이너리.
  - `ext: string` — 이미지 확장자. `mime.getType(ext)` 실패하면 throw.
  - `from: { r, c, rOff?, cOff? }` — 이미지 시작 anchor. `r`/`c` = 0 기반 행, 열, `rOff`/`cOff` = EMU 오프셋(선택).
  - `to: { r, c, rOff?, cOff? }` — 이미지 끝 anchor. 생략하면 `{ r: from.r + 1, c: from.c + 1 }`.

## ExcelRow

```typescript
class ExcelRow {
  cell(c: number): ExcelCell;
  getCells(): Promise<ExcelCell[]>;
}
```

**메서드**

- `cell(c: number)` — 지정된 열 인덱스(0 기반) 셀 반환.
- `getCells()` — 현재 데이터 범위의 모든 셀 배열 반환.

## ExcelCol

```typescript
class ExcelCol {
  cell(r: number): ExcelCell;
  getCells(): Promise<ExcelCell[]>;
  setWidth(size: number): Promise<void>;
}
```

**메서드**

- `cell(r: number)` — 지정된 행 인덱스(0 기반) 셀 반환.
- `getCells()` — 현재 데이터 범위의 모든 셀 배열 반환.
- `setWidth(size: number)` — 열 너비 설정. 단위: Excel 기본 자 (문자 수 기준).
