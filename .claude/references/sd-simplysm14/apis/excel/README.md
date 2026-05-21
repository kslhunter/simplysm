# @simplysm/excel

OOXML(xlsx) ZIP 을 lazy 로 읽고 쓰는 neutral 패키지. 셀 단위 접근 시점에만 해당 XML(SharedStrings/Styles 등)을 로드하므로 대용량 파일 메모리 효율적.

## 사용 트리거 인덱스

- 워크북 열기/생성/저장/해제 → [Workbook](#workbook)
- 워크시트 추가·조회·이름·뷰(탭색/zoom/freeze) → [Worksheet 기본](#worksheet-기본)
- 행/열/셀 접근, 데이터 범위, 2D 셀 조회 → [Row · Col · Cell 접근](#row--col--cell-접근)
- 셀 값/수식/병합 읽고 쓰기 → [Cell 값·수식·병합](#cell-값수식병합)
- 셀 스타일, 워크북 default 스타일 → [Style](#style)
- 조건부 서식 → [Conditional Format](#conditional-format)
- 이미지 삽입 → [Image](#image)
- 데이터 테이블(레코드 배열) ↔ 시트 → [Data Matrix · Records](#data-matrix--records)
- Zod 스키마 기반 타입 안전 입출력 → [ExcelWrapper](#excelwrapper)
- 셀 주소 ↔ 좌표, Excel 날짜 ↔ JS tick → [ExcelUtils](#excelutils)
- 타입(주소·값·스타일·조건부 규칙 등) → [타입](#타입)

---

## Workbook

`new ExcelWorkbook(arg?: Blob | Bytes)` — 인자 없으면 빈 워크북 생성(기본 OOXML 골격: `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`). 인자가 있으면 ZIP 을 lazy reader 로 열기.

핵심 메서드:
- `getWorksheetNames(): Promise<string[]>` — 시트명 배열.
- `addWorksheet(name): Promise<ExcelWorksheet>` — 새 시트 추가 + ContentTypes/Rels 갱신.
- `getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet>` — 이름 또는 0 기반 인덱스. 없으면 throw.
- `setDefaultStyle(opts: ExcelStyleOptions): Promise<void>` — `styles.xml` 의 `fonts[0]/fills[0]/borders[0]` (default 자원 슬롯) 및 `cellXfs[0]` 를 옵션으로 덮어쓰기. 셀 xf 가 자원 id 미지정이면 0번 슬롯이 fallback 되어 전역 적용. 옵션 없는 자원은 0번을 빈 슬롯으로 reset. 미호출 시 원본 보존.
- `toBytes(): Promise<Bytes>` / `toBlob(): Promise<Blob>` — ZIP 직렬화. Blob 의 mime = `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- `close(): Promise<void>` — ZIP 리더와 캐시 해제. 호출 후 다른 메서드 호출 시 throw. 재호출 safe(no-op). **반드시 try/finally 로 호출**.

```typescript
const wb = new ExcelWorkbook(bytes);
try {
  const ws = await wb.getWorksheet(0);
  // ...
} finally { await wb.close(); }
```

## Worksheet 기본

`ExcelWorksheet` 는 `addWorksheet` / `getWorksheet` 로만 획득(직접 생성자 호출 X).

- `getName(): Promise<string>` / `setName(newName: string): Promise<void>`
- `getRange(): Promise<ExcelAddressRangePoint>` — 데이터가 존재하는 범위(시트의 `<dimension>` 기반).
- `getCells(): Promise<ExcelCell[][]>` — `range` 전체를 2차원 배열로.
- `setTabColor(color: string): Promise<void>` — 시트 탭 색. ARGB 8자리 16진수(예: `"00FF0000"`).
- `setZoom(percent: number): Promise<void>` — 보기 확대 비율(%).
- `freezeAt(point: { r?: number; c?: number }): Promise<void>` — 행/열 틀 고정.
- `copyRow(srcR, targetR)` — 행 덮어쓰기 복사.
- `copyCell(srcAddr, targetAddr)` — 셀 복사.
- `copyRowStyle(srcR, targetR)` / `copyCellStyle(srcAddr, targetAddr)` — 스타일만 복사.
- `insertCopyRow(srcR, targetR)` — `targetR` 위치에 행 삽입 복사. 이하 기존 행은 한 칸 아래로 밀린다. 삽입 지점을 관통하는 다중행 병합은 1행 확장. 원본의 단일행 병합은 복제.

## Row · Col · Cell 접근

`ExcelWorksheet` 인스턴스 메서드 (모두 0 기반 인덱스, 인스턴스는 캐싱됨):
- `row(r): ExcelRow` / `col(c): ExcelCol` / `cell(r, c): ExcelCell`

`ExcelRow`:
- `cell(c): ExcelCell` — 같은 행의 셀.
- `getCells(): Promise<ExcelCell[]>` — 시트 `range` 의 열 범위만큼.

`ExcelCol`:
- `cell(r): ExcelCell` — 같은 열의 셀.
- `getCells(): Promise<ExcelCell[]>` — 시트 `range` 의 행 범위만큼.
- `setWidth(size: number): Promise<void>` — 열 너비(OOXML 단위).

## Cell 값·수식·병합

`ExcelCell.addr: ExcelAddressPoint` — 0 기반 `{r, c}`.

- `getValue(): Promise<ExcelValueType>` — 셀 타입과 styles.xml 의 numFmt 를 보고 자동 변환:
  - `s`(SharedString) → `string`
  - `str`/`inlineStr` → `string`
  - `b` → `boolean`
  - `n` 또는 타입 미지정 → `numFmt` 가 날짜 계열이면 `DateOnly`/`DateTime`/`Time`, 아니면 `number`. 텍스트 형식(numFmtId 49)이면 `string`.
  - `e`(error) → throw.
- `setValue(val: ExcelValueType): Promise<void>` — 값 타입으로 자동 분기:
  - `undefined` → 셀 삭제
  - `string` → SharedString 으로 등록(`t="s"`)
  - `boolean` → `t="b"`, `"1"`/`"0"`
  - `number` → numeric
  - `DateOnly`/`DateTime`/`Time` → Excel 날짜 숫자로 변환 + 해당 numFmt(14/22/18) 자동 적용
  - 그 외 타입 → throw.
- `setFormula(val: string | undefined): Promise<void>` / `getFormula(): Promise<string | undefined>` — 수식 설정/조회. `undefined` 전달 시 셀 삭제.
- `merge(r, c): Promise<void>` — 현재 셀에서 `(r, c)` 까지 병합(양 끝 inclusive). 예: `cell(0,0).merge(2,2)` → A1:C3.

## Style

- `cell.setStyle(opts: ExcelStyleOptions): Promise<void>` — 셀 스타일 적용. 기존 styleId 가 있으면 clone + override.
- `cell.getStyleId(): Promise<string | undefined>` / `setStyleId(id)` — 원시 cellXfs id 조작.
- `wb.setDefaultStyle(opts)` — 워크북 default. [Workbook](#workbook) 참고.

`ExcelStyleOptions`:
- `background?: string` — 셀 배경. ARGB 8자리(예: `"00FF0000"`).
- `border?: ("left" | "right" | "top" | "bottom")[]` — 활성화할 변. style 은 thin.
- `horizontalAlign?: "left" | "center" | "right"` / `verticalAlign?: "top" | "center" | "bottom"`.
- `numberFormat?: "number" | "string" | "DateOnly" | "DateTime" | "Time"` — 프리셋 numFmtId 매핑(0/49/14/22/18).
- `numberFormatCode?: string` — 임의 Excel formatCode(예: `"0.000000"`). `numberFormat` 보다 우선.
- `font?: ExcelFont` — `{ size?, family?, bold?, italic?, underline?: "single"|"double"|"singleAccounting"|"doubleAccounting", color?: ARGB8, strike? }`. 미지정 속성은 emit 안 함(Excel 기본값 표시).

## Conditional Format

`ws.addConditionalFormat({ ref, rules }): Promise<void>` — 셀/범위에 조건부 서식 규칙 추가. `ref` = `"A1"` 또는 `"A1:B10"`. `rules` 배열 순서가 priority(앞 우선). 같은 시트에 여러 번 호출하면 블록이 누적되고 priority 가 시트 전역으로 이어붙음. 빈 배열이면 no-op.

`ExcelConditionalRule` 종류:
- `{ type: "cellIs", op: "<"|">"|"<="|">="|"="|"<>", value: number|string, style }` — 단일 비교. `value` 가 string 이면 따옴표 리터럴 formula 로 emit, number 면 raw formula.
- `{ type: "cellIs", op: "between"|"notBetween", value: [a,b], style }` — 양 끝 inclusive 구간.
- `{ type: "text", op: "contains"|"notContains"|"beginsWith"|"endsWith", value: string, style }` — SEARCH 기반(대소문자 무시) 고정.
- `{ type: "expression", formula: string, style }` — 임의 수식 식.

`ExcelConditionalRuleStyle`:
- `background?: ARGB8` — 강조 배경.
- `fontColor?: ARGB8` — 글자색.
- `fontWeight?: "bold" | "normal"` — `"normal"` 은 base 가 bold 라도 강제 normal.

미지정 필드는 base 셀 스타일을 유지하며, 지정 필드만 OOXML dxf 로 emit 되어 Excel native CF 오버레이로 합성.

```typescript
await ws.addConditionalFormat({
  ref: "B2:B100",
  rules: [{ type: "cellIs", op: "<", value: 1000, style: { background: "00FF0000" } }],
});
```

## Image

`ws.addImage(opts): Promise<void>`
- `bytes: Bytes` — 이미지 바이너리.
- `ext: string` — 확장자(`png`/`jpg` 등). `mime` 라이브러리로 MIME 결정, 미인식 시 throw.
- `from: { r, c, rOff?: number|string, cOff?: number|string }` — 시작 위치(0 기반 행/열, `rOff/cOff` 는 EMU 오프셋).
- `to?: { r, c, rOff?, cOff? }` — 끝 위치. 생략 시 `from.r+1`, `from.c+1` 의 1×1 셀 크기.

기존 drawing 이 있으면 거기에 picture 를 추가하고, 없으면 `xl/drawings/drawing{N}.xml` 신규 생성 + ContentTypes/sheet rels 연결.

## Data Matrix · Records

`ws.setDataMatrix(matrix: ExcelValueType[][]): Promise<void>` — 2D 배열(행 우선)을 (0,0) 부터 기록. 셀 값은 `setValue` 와 동일 규칙으로 자동 분기.

`ws.setRecords(records: Record<string, ExcelValueType>[]): Promise<void>` — 0행에 헤더(레코드들의 key union, 빈 문자열 제외), 1행부터 데이터.

`ws.getDataTable(opt?): Promise<Record<string, ExcelValueType>[]>`:
- `opt.headerRowIndex?: number` — 헤더 행 인덱스(기본 = `range.s.r`).
- `opt.checkEndColIndex?: number` — 이 열이 비어 있으면 데이터 종료로 판정.
- `opt.usableHeaderNameFn?: (headerName) => boolean` — 사용할 헤더 필터. 헤더가 string 타입인 컬럼만 후보. 헤더 중복 발견 시 throw.

## ExcelWrapper

`new ExcelWrapper<TSchema>(schema)` — Zod 스키마로 Excel ↔ 레코드 변환. 필드의 `.describe("...")` 가 Excel 헤더 이름. describe 없으면 필드 key.

- `read(file, wsNameOrIndex = 0, options?: { excludes? }): Promise<z.infer<TSchema>[]>`
  - 시트의 헤더 행에서 스키마와 매칭되는 컬럼만 추출.
  - 각 행을 변환(`ZodString`→string, `ZodNumber`→`num.parseFloat`, `ZodBoolean`→`"1"/"true"`/`"0"/"false"`/Boolean 강제), `safeParse` 로 검증, 실패 시 throw.
  - 전 컬럼이 null/empty 인 행은 skip.
  - 데이터 0행이면 throw.
  - `options.excludes` 로 특정 필드 제외.
  - 내부적으로 ExcelWorkbook 을 열고 finally 에서 close.
- `write(wsName, records, options?: { excludes? }): Promise<ExcelWorkbook>`
  - 헤더 = describe 이름 또는 key.
  - 데이터 본문 기록 후 전체 셀에 4변 테두리.
  - 필수 필드(Optional/Nullable/Default 가 아님) + boolean 아닌 필드의 헤더 셀에 노란색(`"00FFFF00"`) 배경.
  - `setZoom(85)`, `freezeAt({ r: 0 })`.
  - 반환된 워크북의 `close()` 는 호출자 책임. 내부 throw 시에는 자동 close 후 rethrow.

## ExcelUtils

정적 메서드 모음.

- `stringifyAddr({r,c})` → `"B3"`. `stringifyRowAddr(r)` → `"3"`. `stringifyColAddr(c)` → `"AA"` 등. `c` 범위 0~16383, 초과 시 throw.
- `parseCellAddr("B3")` → `{r:2, c:1}`. `parseRowAddr`/`parseColAddr` 동일 패턴.
- `parseRangeAddr("A1:C3")` → `{s, e}`. 단일 셀 입력 시 `s === e`.
- `stringifyRangeAddr({s,e})` → `"A1:C3"`. `s === e` 면 단일 주소만.
- `convertTimeTickToNumber(tick)` / `convertNumberToTimeTick(value)` — JS ms tick ↔ Excel serial date. Excel 기준일 = 1899-12-30.
- `convertNumFmtCodeToName(code)` → `ExcelNumberFormat`. `"General"` = number. `yy`/`dd`/`mm` 패턴 검출(`hh:mm`/`mm:ss` 의 mm 은 분으로 제외)로 Date/Time 분류. 매칭 실패 시 throw.
- `convertNumFmtIdToName(id)` → `ExcelNumberFormat`. Excel 내장 ID 범위 기반(숫자: 0–13,37–40,48 / Date: 14–17,27–31,34–36,50–58 / DateTime: 22 / Time: 18–21,32–33,45–47 / string: 49). 매칭 실패 시 throw.
- `convertNumFmtNameToId(name)` — number→0, DateOnly→14, DateTime→22, Time→18, string→49.

## 타입

- `ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined` — 셀 값 도메인. `undefined` = 빈 셀.
- `ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time"` — 숫자 형식 프리셋 이름.
- `ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e"` — OOXML 의 셀 `t` 속성: SharedString / boolean / 수식결과문자열 / 숫자 / 인라인문자열 / 에러.
- `ExcelAddressPoint = { r: number; c: number }` — 0 기반 좌표.
- `ExcelAddressRangePoint = { s: ExcelAddressPoint; e: ExcelAddressPoint }` — start/end inclusive.
- `ExcelBorderPosition = "left" | "right" | "top" | "bottom"`.
- `ExcelHorizontalAlign = "center" | "left" | "right"` / `ExcelVerticalAlign = "center" | "top" | "bottom"`.
- `ExcelFontUnderline = "single" | "double" | "singleAccounting" | "doubleAccounting"` — OOXML `<u val>` 그대로.
- `ExcelFont`, `ExcelStyleOptions` — [Style](#style) 참고.
- `ExcelConditionalRule`, `ExcelConditionalRuleStyle` — [Conditional Format](#conditional-format) 참고.
- `ExcelXml` — `{ data: unknown; cleanup(): void }`. ZipCache 가 보관하는 XML 객체의 공통 인터페이스(내부용).
- `Excel*Data` 인터페이스들 — OOXML XML 의 JS 객체 표현(xml2js 스타일, 내부 처리용). 외부 코드에서 직접 다룰 일 없음.
