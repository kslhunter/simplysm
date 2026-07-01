# @simplysm/excel — ExcelWorkbook / ExcelWorksheet / ExcelRow / ExcelCol

워크북을 생성·열기, 시트 추가·조회·이름 변경, 시트 단위 데이터·복사·보기·이미지·내보내기, 행/열 핸들 접근을 한 작업 흐름에서 다루는 클래스 군. 개별 셀 조작은 [cell.md](./cell.md), 스타일 옵션은 [style.md](./style.md), 조건부 서식 규칙은 [conditional-format.md](./conditional-format.md) 참조.

워크북·시트·셀 메서드는 대부분 `async` 다. ZIP 안의 XML/BIFF 파트를 접근 시점에만 lazy-load 하여 대용량 파일에서도 필요한 파트만 읽는 설계이기 때문이다.

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

- `arg: Blob | Bytes` — 기존 Excel 파일 데이터. 이 데이터로 `ZipCache` 를 구성하며, 포맷은 ZIP 안 `xl/workbook.bin` 존재 여부로 1회 판별한다(없으면 `xlsx`).
- `arg.format: "xlsx" | "xlsb"` — 새 빈 워크북을 만들 때 쓸 컨테이너 포맷. 미지정 시 `"xlsx"`. `"xlsx"` 는 OOXML XML 파트, `"xlsb"` 는 BIFF12 binary 파트로 골격을 등록하며 새 워크북에선 ContentTypes·전역 rels·workbook·workbook rels 를 함께 생성한다.
- `zipCache` — ZIP 파일 파트 캐시(공개 readonly). 일반 흐름은 메서드를 통해 파트를 갱신한다.
- `name` — 추가할 워크시트 이름. workbook 모델에서 이름이 sanitize 되고 relId/sheetId 가 자동 증가한다.
- `nameOrIndex: string` — 저장된 시트 이름으로 조회. 없으면 throw.
- `nameOrIndex: number` — 0 기반 시트 인덱스로 조회. 없으면 throw.
- `opts` — 워크북 default cell style(아래 메서드 동작 참조).

메서드 동작:

- `getWorksheetNames()` — workbook 파트에 등록된 시트 이름 배열(`sheetNames`)을 반환한다. `close()` 이후 호출하면 throw.
- `addWorksheet(name)` — workbook 엔트리를 추가하고, ZipCache 로 content-type override·workbook rel·빈 worksheet 파트를 포맷에 맞게 등록한 뒤 새 `ExcelWorksheet` 를 반환한다. `close()` 이후 호출하면 throw.
- `getWorksheet(nameOrIndex)` — 이름/인덱스로 시트 관계 ID를 찾고 worksheet 파일명을 해석해 `ExcelWorksheet` 를 반환한다. 같은 관계 ID는 인스턴스를 캐시한다. `close()` 이후 호출하면 throw.
- `setDefaultStyle(opts)` — `xl/styles.xml` 의 `fonts[0]`/`fills[0]`/`borders[0]` 0번 자원 슬롯 자체를 입력 옵션으로 덮어쓴다. 셀 xf 가 해당 자원 id 를 명시하지 않으면 0번 슬롯이 fallback 되므로 "표준" 셀 스타일이 워크북 전역에 적용된다. horizontalAlign/verticalAlign/numberFormat/numberFormatCode 는 0번 슬롯 개념이 없어 `cellXfs[0].xf[0]` 에 박힌다. 옵션이 없는 자원 슬롯은 빈 슬롯(`{}`/patternType="none")으로 reset 되고, 미호출 시 0번 슬롯과 `cellXfs[0]` 는 원본이 보존된다. `close()` 이후 호출하면 throw.
- `toBytes()` — 캐시된 모델 파트를 직렬화하고 ZIP 압축 결과를 `Bytes` 로 반환한다. `close()` 이후 호출하면 throw.
- `toBlob()` — `toBytes()` 결과를 MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` Blob 으로 감싼다. `close()` 이후 호출하면 throw.
- `close()` — ZIP 리더와 내부 시트 캐시를 정리한다. 이미 닫힌 워크북이면 no-op.

리소스: `ExcelWorkbook` 은 내부 ZIP 리소스를 보유하므로 사용 후 반드시 `close()` 해야 한다.

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

- `newName` — 변경할 시트 이름(추가 시와 같은 sanitize 를 거친다).
- `r` / `c` — 0 기반 행/열 인덱스. `row(r)`, `cell(r,c)`, `col(c)`, `freezeAt({ r, c })` 등에서 쓴다.
- `srcR` / `targetR` — 행 복사·삽입의 원본/대상 행 인덱스(0 기반).
- `srcAddr` / `targetAddr` — 셀 복사의 원본/대상 좌표(0 기반).
- `matrix` — 행 우선 2차원 셀 값 배열. 각 원소는 `ExcelValueType` 규칙으로 쓰인다.
- `records` — 객체 배열. 전체 record key 의 distinct(빈 문자열 제외) 목록을 헤더로 만든다.
- `color` — 시트 탭 색상(ARGB 8자리, 예: `"00FF0000"`).
- `percent` — 확대/축소 비율(퍼센트).
- `point.r` / `point.c` — 틀 고정할 마지막 행/열 인덱스. 둘 다·하나만·없음 조합에 따라 고정 영역이 결정된다.
- `range` — 자동 필터/내보내기 범위 좌표. 헤더행~데이터 끝 전체를 덮도록 지정한다.
- `opt.headerRowIndex` — 헤더 행 인덱스. 미지정 시 데이터 범위 시작 행.
- `opt.checkEndColIndex` — 데이터 종료 판정 열. 해당 열 값이 `null`/`undefined` 이면 그 행에서 반복을 중단한다.
- `opt.usableHeaderNameFn` — 문자열 헤더명을 채택할지 결정하는 필터. `false` 인 헤더는 결과 record 에 포함되지 않는다.
- `opts.ref` — 조건부 서식 적용 단일 셀/범위 A1 주소(자세히는 [conditional-format.md](./conditional-format.md)).
- `opts.rules` — 조건부 서식 규칙 배열. 빈 배열이면 아무 작업도 하지 않는다.
- `opts.bytes` — 삽입할 이미지 바이너리.
- `opts.ext` — 이미지 확장자. `mime.getType(ext)` 가 실패하면 throw.
- `opts.from` — 이미지 시작 anchor. `r`/`c` 는 0 기반 행·열, `rOff`/`cOff` 는 EMU 오프셋.
- `opts.to` — 이미지 끝 anchor. 생략하면 `{ r: from.r + 1, c: from.c + 1 }`.

메서드 동작:

- `getName()` / `setName(newName)` — workbook 파트의 관계 ID에 매핑된 시트명을 읽고 쓴다. 관계 ID가 없으면 throw.
- `row(r)` / `cell(r,c)` / `col(c)` — 행·셀·열 핸들을 동기 반환하고 내부 Map 에 캐시한다.
- `copyRowStyle(srcR, targetR)` — 현재 데이터 범위의 모든 열에 대해 원본 행 셀의 styleId 만 대상 행에 복사한다. 원본 styleId 가 없는 셀은 대상 스타일을 건드리지 않는다.
- `copyCellStyle(srcAddr, targetAddr)` — 원본 셀 styleId 가 있으면 대상 셀에 같은 styleId 를 지정한다.
- `copyRow(srcR, targetR)` / `copyCell(srcAddr, targetAddr)` — 원본 행/셀을 대상 위치로 복제(덮어쓰기)한다.
- `insertCopyRow(srcR, targetR)` — `targetR` 이상 행을 아래로 한 칸 밀고 원본 행을 대상 위치에 복사한다. 삽입 지점 이하 병합은 이동하고, 삽입 지점을 관통하는 다중행 병합은 1행 확장되며, 원본의 단일행 병합은 대상 행에도 복사된다. `srcR >= targetR` 이면 밀린 원본 위치를 보정한다.
- `getRange()` — 데이터가 존재하는 셀 범위를 `{ s, e }` 로 반환한다.
- `getCells()` — 데이터 범위의 각 행 셀을 모아 2차원 배열로 반환한다.
- `getDataTable(opt)` — 헤더 행의 문자열 셀만 key 로 삼고(중복 헤더는 throw), 이후 행을 `Record<string, ExcelValueType>` 로 변환한다.
- `setDataMatrix(matrix)` — 행·열 인덱스 0부터 matrix 값을 동기 내부 루프로 기록한다. `undefined` 는 해당 셀 삭제로 처리된다.
- `setRecords(records)` — 모든 record 의 key distinct 목록을 0행 헤더로 쓰고 1행부터 데이터를 쓴다. 빈 문자열 key 는 제외한다.
- `setTabColor(color)` — worksheet `sheetPr.tabColor.rgb` 를 설정한다.
- `setZoom(percent)` — workbook view 골격을 보장(`initializeView`)한 뒤 worksheet `zoomScale` 을 설정한다.
- `freezeAt(point)` — workbook view 골격을 보장한 뒤 worksheet pane 을 frozen 으로 설정한다.
- `setAutoFilter(range)` — worksheet `autoFilter.ref` 를 지정 범위 A1 문자열로 설정한다.
- `addConditionalFormat(opts)` — 규칙별 dxf 를 styles 파트에 등록하고 worksheet `conditionalFormatting` 블록을 누적한다.
- `addImage(opts)` — media 파일, `[Content_Types].xml`, worksheet rels, drawing, drawing rels 를 생성하거나 재사용해 이미지 anchor 를 추가한다. 같은 시트에 기존 drawing 이 있으면 거기에 그림을 덧붙인다.
