# @simplysm/excel — ExcelWorkbook / ExcelWorksheet

.xlsx 파일을 열거나 새로 만들고, 시트를 추가·조회하고, 시트 단위로 데이터 테이블/매트릭스/이미지/뷰를 다루고, 바이트/Blob 로 내보낼 때 함께 읽는 묶음. 워크북은 내부 ZIP 리소스를 lazy-load 하므로 사용 후 반드시 `close()` 해야 한다.

## ExcelWorkbook

```typescript
new ExcelWorkbook(arg?: Blob | Bytes)
```

- 생성자 `arg` — 기존 .xlsx 데이터(`Blob` 또는 `Uint8Array`). 생략하면 빈 워크북(ContentTypes/rels/workbook 골격)을 새로 만든다. 기존 파일 편집이면 전달, 새 파일 생성이면 생략.

메서드:

- `getWorksheetNames(): Promise<string[]>` — 워크북의 모든 시트 이름을 정의 순서로 반환.
- `addWorksheet(name: string): Promise<ExcelWorksheet>` — 새 시트를 만들어 반환. ContentTypes·workbook rels 도 함께 갱신. `name` = 추가할 시트 이름.
- `getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet>` — 이름(string) 또는 0 기반 인덱스(number)로 시트 조회. 같은 시트는 캐시돼 동일 인스턴스 반환. 없으면 throw.
- `setDefaultStyle(opts: ExcelStyleOptions): Promise<void>` — 워크북 전역 default 셀 스타일. fontId/fillId/borderId 를 명시하지 않은 모든 셀에 적용. 자세히: [style.md](./style.md).
- `toBytes(): Promise<Bytes>` — 워크북을 ZIP 직렬화해 바이트로 반환.
- `toBlob(): Promise<Blob>` — `toBytes()` 결과를 xlsx MIME 의 `Blob` 으로 래핑. 브라우저 다운로드용.
- `close(): Promise<void>` — ZIP 리더·내부 캐시 해제. 호출 후 워크북 사용 불가. 이미 닫혔으면 no-op(안전). 미호출 시 리소스 누수.
- `readonly zipCache: ZipCache` — 내부 ZIP 캐시. 일반 사용에서는 직접 다루지 않음.

`close()` 외 모든 메서드는 닫힌 워크북에서 호출 시 throw.

### 사용 예

```typescript
const wb = new ExcelWorkbook(bytes); // 기존 파일 열기
try {
  const ws = await wb.getWorksheet(0);
  const table = await ws.getDataTable({ checkEndColIndex: 0 });
} finally {
  await wb.close();
}
```

## ExcelWorksheet

`wb.getWorksheet` / `wb.addWorksheet` 로 얻는다. 행/열/셀 접근, 복사, 데이터 변환, 뷰, 조건부 서식, 이미지를 제공.

### 이름

- `getName(): Promise<string>` — 시트 이름 반환(못 찾으면 throw).
- `setName(newName: string): Promise<void>` — 시트 이름 변경.

### 셀/행/열 접근 (모두 0 기반)

- `row(r): ExcelRow` — `r` 행 객체(캐시). 행 단위 순회·셀 접근. 자세히: [cell.md](./cell.md).
- `col(c): ExcelCol` — `c` 열 객체(캐시). 열 단위 순회·너비 설정.
- `cell(r, c): ExcelCell` — 단일 셀 객체(캐시). 값/수식/스타일/병합.
- `getRange(): Promise<ExcelAddressRangePoint>` — 시트의 데이터 범위(`{s, e}`).
- `getCells(): Promise<ExcelCell[][]>` — 데이터 범위 전체를 행 우선 2차원 셀 배열로.

### 복사

- `copyCellStyle(srcAddr, targetAddr): Promise<void>` — 셀 스타일 ID 만 복사(값 미복사). `srcAddr`/`targetAddr` = `ExcelAddressPoint`.
- `copyRowStyle(srcR, targetR): Promise<void>` — 데이터 범위 폭만큼 한 행의 셀 스타일을 다른 행에 복사.
- `copyCell(srcAddr, targetAddr): Promise<void>` — 셀 전체(값·수식·스타일) 복사.
- `copyRow(srcR, targetR): Promise<void>` — 한 행을 다른 행으로 복사(대상 덮어쓰기).
- `insertCopyRow(srcR, targetR): Promise<void>` — `srcR` 행을 `targetR` 위치에 삽입 복사. `targetR` 이하 기존 행은 한 칸 아래로 밀리고, 삽입 지점을 관통하는 다중행 병합은 1행 확장된다. 행 추가 삽입(기존 보존)이 필요할 때 `copyRow`(덮어쓰기) 대신 사용.

### 데이터 변환

- `getDataTable(opt?): Promise<Record<string, ExcelValueType>[]>` — 헤더 행을 키로, 이후 행을 레코드로 변환.
  - `opt.headerRowIndex?: number` — 헤더로 쓸 행 인덱스. 미지정 시 데이터 범위 첫 행.
  - `opt.checkEndColIndex?: number` — 데이터 끝 판정 열. 이 열이 비면 그 행에서 중단. 빈 행 뒤 잡음 데이터를 끊을 때 지정.
  - `opt.usableHeaderNameFn?: (headerName: string) => boolean` — `true` 반환한 헤더만 컬럼으로 채택. 일부 컬럼만 읽을 때.
  - 헤더 문자열이 중복되면 throw.
- `setDataMatrix(matrix: ExcelValueType[][]): Promise<void>` — 0행 0열부터 행 우선으로 2차원 배열을 그대로 기록.
- `setRecords(records: Record<string, ExcelValueType>[]): Promise<void>` — 0행에 헤더(전 레코드 키의 distinct, 빈 키 제외) 자동 생성 후 1행부터 값 기록.

### 뷰

- `setTabColor(color): Promise<void>` — 시트 탭 색. `color` = ARGB 8자리(예: `"00FF0000"`).
- `setZoom(percent): Promise<void>` — 확대/축소 비율(퍼센트).
- `freezeAt(point: { r?: number; c?: number }): Promise<void>` — 틀 고정. `r` = 이 행 위에서 고정, `c` = 이 열 왼쪽에서 고정. 둘 다/하나만 지정 가능.

### 조건부 서식 / 이미지

- `addConditionalFormat(opts): Promise<void>` — 셀/범위에 native CF 규칙 추가. 자세히: [conditional-format.md](./conditional-format.md).
- `addImage(opts): Promise<void>` — 이미지 삽입.
  - `opts.bytes: Bytes` — 이미지 바이너리.
  - `opts.ext: string` — 확장자(png/jpg 등). MIME 결정 불가 시 throw.
  - `opts.from: { r, c, rOff?, cOff? }` — 시작 앵커(0 기반 행/열, `rOff`/`cOff` 는 EMU 오프셋).
  - `opts.to?: { r, c, rOff?, cOff? }` — 끝 앵커. 생략 시 `from` 기준 1행·1열 크기로 배치.
  - 같은 시트의 기존 drawing 이 있으면 재사용하고 없으면 새로 만든다.

### 사용 예

```typescript
const ws = await wb.addWorksheet("매출");
await ws.setRecords([{ 품목: "사과", 수량: 10 }]);
await ws.setZoom(85);
await ws.freezeAt({ r: 0 });
await ws.addImage({ bytes, ext: "png", from: { r: 0, c: 3 } });
```
