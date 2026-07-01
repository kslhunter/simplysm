# @simplysm/excel — ExcelWorkbook / ExcelWorksheet

워크북을 생성·열기, 시트 추가·조회·이름 변경, 시트 단위 데이터·복사·보기·이미지·내보내기를 한 작업 흐름에서 다루는 클래스 군. 개별 셀·행·열 핸들은 [cell.md](./cell.md), 스타일 옵션은 [style.md](./style.md), 조건부 서식 규칙은 [conditional-format.md](./conditional-format.md) 참조.

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

- `arg: Blob | Bytes` — 기존 Excel 파일 데이터. `ZipCache` 가 ZIP 안의 `xl/workbook.bin` 존재 여부로 `xlsb` 를 판별하고, 없으면 `xlsx` 로 처리한다.
- `arg.format: "xlsx" | "xlsb"` — 새 빈 워크북을 만들 때 사용할 컨테이너 포맷. 미지정 시 `"xlsx"` 로 생성한다.
- `"xlsx"` — 새 워크북의 workbook/worksheet/sharedStrings/styles 파트를 XML 경로로 등록한다.
- `"xlsb"` — 새 워크북의 workbook/worksheet/sharedStrings/styles 파트를 BIFF12 binary 경로로 등록한다.
- `zipCache` — ZIP 파일 파트 캐시. 공개 readonly 필드지만 일반 API 흐름은 메서드를 통해 파트를 갱신한다.
- `name` — 추가할 워크시트 이름. `: \\ / ? * [ ] '` 문자는 제거되고, 전부 제거되어 빈 문자열이면 `"Sheet"` 로 저장된다.
- `nameOrIndex: string` — 저장된 시트 이름으로 조회하며 없으면 throw 한다.
- `nameOrIndex: number` — 0 기반 시트 인덱스로 조회하며 없으면 throw 한다.
- `opts` — 워크북 default cell style. `fonts[0]`/`fills[0]`/`borders[0]` 0번 자원 슬롯과 `cellXfs[0]` 를 갱신한다.

메서드 동작:

- `getWorksheetNames()` — 워크북의 시트 이름 배열을 workbook 파트 순서대로 반환한다. `close()` 이후 호출하면 throw 한다.
- `addWorksheet(name)` — workbook 엔트리, workbook rels, ContentTypes, 빈 worksheet 파트를 함께 등록하고 새 `ExcelWorksheet` 를 반환한다. `close()` 이후 호출하면 throw 한다.
- `getWorksheet(nameOrIndex)` — 시트 관계 ID를 찾고 worksheet 파일명을 해석해 `ExcelWorksheet` 를 반환한다. 같은 관계 ID는 인스턴스를 캐시한다.
- `setDefaultStyle(opts)` — 스타일 파트를 만들거나 가져와 default style 을 적용한다. 미지정 font/fill/border 자원은 빈 슬롯으로 reset 된다.
- `toBytes()` — 캐시된 모델 파트를 직렬화하고 ZIP 압축 결과를 `Bytes` 로 반환한다. `close()` 이후 호출하면 throw 한다.
- `toBlob()` — `toBytes()` 결과를 MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` Blob 으로 감싼다. `close()` 이후 호출하면 throw 한다.
- `close()` — ZIP 리더와 내부 시트 캐시를 정리한다. 이미 닫힌 워크북이면 no-op 이다.

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
  getDataTable(opt?: { headerRowIndex?: number; checkEndColIndex?: number; usableHeaderNameFn?: (headerName: string) => boolean }): Promise<Record<string, ExcelValueType>[]>;
  setDataMatrix(matrix: ExcelValueType[][]): Promise<void>;
  setRecords(records: Record<string, ExcelValueType>[]): Promise<void>;
  setTabColor(color: string): Promise<void>;
  setZoom(percent: number): Promise<void>;
  freezeAt(point: { r?: number; c?: number }): Promise<void>;
  setAutoFilter(range: ExcelAddressRangePoint): Promise<void>;
  addConditionalFormat(opts: { ref: string; rules: ExcelConditionalRule[] }): Promise<void>;
  addImage(opts: { bytes: Bytes; ext: string; from: { r: number; c: number; rOff?: number | string; cOff?: number | string }; to?: { r: number; c: number; rOff?: number | string; cOff?: number | string } }): Promise<void>;
}
```

- `newName` — 변경할 시트 이름. 추가 시와 같은 문자 제거 규칙을 거쳐 저장된다.
- `r` — 0 기반 행 인덱스. `row(r)`, `cell(r,c)`, `freezeAt({ r })` 에서 사용한다.
- `c` — 0 기반 열 인덱스. `col(c)`, `cell(r,c)`, `freezeAt({ c })` 에서 사용한다.
- `srcR` — 복사 원본 행 인덱스. `insertCopyRow` 에서 `srcR >= targetR` 이면 삽입으로 밀린 원본 위치를 보정한다.
- `targetR` — 복사·삽입 대상 행 인덱스. `insertCopyRow` 는 이 행 이상을 아래로 한 칸 민다.
- `srcAddr` — 복사 원본 셀 0 기반 좌표.
- `targetAddr` — 복사 대상 셀 0 기반 좌표.
- `matrix` — 행 우선 2차원 셀 값 배열. 각 원소는 `ExcelValueType` 규칙으로 쓰인다.
- `records` — 객체 배열. 전체 record key 의 distinct 목록을 헤더로 만들고 0행부터 쓴다.
- `color` — 시트 탭 색상 문자열. worksheet `tabColor.rgb` 에 그대로 저장된다.
- `percent` — 확대/축소 비율 숫자. worksheet `zoomScale` 에 문자열로 저장된다.
- `point.r` — 고정할 마지막 행 인덱스. 있으면 `ySplit = r + 1` 로 저장된다.
- `point.c` — 고정할 마지막 열 인덱스. 있으면 `xSplit = c + 1` 로 저장된다.
- `range` — 자동 필터 범위 좌표. A1 범위 문자열로 변환되어 worksheet `autoFilter.ref` 에 저장된다.
- `opt.headerRowIndex` — 헤더 행 인덱스. 미지정 시 worksheet 데이터 범위의 시작 행을 사용한다.
- `opt.checkEndColIndex` — 데이터 종료 판정 열. 해당 열 값이 `null`/`undefined` 이면 그 행에서 반복을 중단한다.
- `opt.usableHeaderNameFn` — 문자열 헤더명을 받을지 결정하는 필터 함수. false 인 헤더는 결과 record 에 포함하지 않는다.
- `opts.ref` — 조건부 서식을 적용할 단일 셀 또는 범위 주소. worksheet `sqref` 로 저장되고 텍스트 규칙 formula 의 기준 top-left 주소를 여기서 뽑는다.
- `opts.rules` — 조건부 서식 규칙 배열. 빈 배열이면 아무 것도 추가하지 않는다.
- `opts.bytes` — 삽입할 이미지 바이너리.
- `opts.ext` — 이미지 확장자. `mime.getType(ext)` 가 실패하면 throw 한다.
- `opts.from` — 이미지 시작 anchor. `r`/`c` 는 0 기반 행·열, `rOff`/`cOff` 는 EMU 오프셋으로 drawing 에 전달된다.
- `opts.to` — 이미지 끝 anchor. 생략하면 `{ r: from.r + 1, c: from.c + 1 }` 로 drawing 에 전달된다.

메서드 동작:

- `getName()` / `setName(newName)` — workbook 파트의 관계 ID에 매핑된 시트명을 읽고 쓴다. 관계 ID가 없으면 throw 한다.
- `row(r)` / `cell(r,c)` / `col(c)` — 행·셀·열 핸들을 동기 반환하고 내부 Map 에 캐시한다.
- `copyRowStyle(srcR, targetR)` — 현재 데이터 범위의 모든 열에 대해 원본 행 셀의 styleId 만 대상 행에 복사한다. 원본 styleId 가 없는 셀은 대상 스타일을 건드리지 않는다.
- `copyCellStyle(srcAddr, targetAddr)` — 원본 셀 styleId 가 있으면 대상 셀에 같은 styleId 를 지정한다.
- `copyRow(srcR, targetR)` — 원본 행 XML을 복제해 대상 행 주소로 치환한다. 원본 행이 없으면 대상 행을 삭제한다. 대상 행을 관통하던 병합은 제거하고, 원본 행을 관통하는 병합은 대상 위치로 복사한다.
- `copyCell(srcAddr, targetAddr)` — 원본 셀 XML을 복제해 대상 주소로 치환한다. 원본 셀이 없으면 대상 셀을 삭제한다.
- `insertCopyRow(srcR, targetR)` — `targetR` 이상 행을 아래로 밀고 원본 행을 대상 위치에 복사한다. 삽입 지점 이하 병합은 이동하고, 삽입 지점을 관통하는 다중행 병합은 확장되며, 원본의 단일행 병합은 대상 행에도 복사된다.
- `getRange()` — 존재하는 셀 기준 데이터 범위를 `{ s, e }` 로 반환한다. 빈 시트도 기본 범위는 A1 좌표다.
- `getCells()` — 데이터 범위의 행마다 `ExcelRow.getCells()` 결과를 모아 2차원 배열로 반환한다.
- `getDataTable(opt)` — 헤더 행의 문자열 셀만 key 로 삼고, 중복 헤더가 있으면 throw 한다. 이후 행을 record 로 변환한다.
- `setDataMatrix(matrix)` — 행·열 인덱스 0부터 matrix 값을 동기 내부 루프로 기록한다. `undefined` 값은 해당 셀 삭제로 처리된다.
- `setRecords(records)` — 모든 record 의 key 를 distinct 헤더로 만들고, 0행에 헤더·1행부터 데이터를 쓴다. 빈 문자열 key 는 제외한다.
- `setTabColor(color)` — worksheet `sheetPr.tabColor.rgb` 를 설정하며 기존 탭 색은 덮어쓴다.
- `setZoom(percent)` — workbook view 골격을 보장한 뒤 worksheet `zoomScale` 을 설정한다.
- `freezeAt(point)` — workbook view 골격을 보장한 뒤 worksheet pane 을 frozen 상태로 설정한다. `r`/`c` 존재 여부에 따라 activePane 이 달라진다.
- `setAutoFilter(range)` — worksheet `autoFilter.ref` 를 지정 범위로 설정한다.
- `addConditionalFormat(opts)` — 조건부 서식 dxf 를 스타일 파트에 등록하고 worksheet conditionalFormatting 블록을 누적한다.
- `addImage(opts)` — media 파일, ContentTypes, worksheet rels, drawing, drawing rels 를 만들거나 재사용해 이미지 anchor 를 추가한다.