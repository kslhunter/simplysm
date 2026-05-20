# @simplysm/excel

OOXML(xlsx) 워크북을 lazy-load 로 읽고 쓰는 클래스 묶음. ZIP 내부 XML 을 접근 시점에만 파싱한다.

## 사용 트리거 인덱스
- **`ExcelWorkbook`** — xlsx 바이트/Blob 을 열거나 새 워크북을 만들 때. 사용 후 `close()` 필수.
- **`ExcelWorkbook.setDefaultStyle`** — 워크북 전역(폰트·정렬·numFmt 등) 셀 표준을 한번에 적용.
- **`ExcelWorksheet`** — 시트 단위 셀 접근의 진입점. 이름·범위 조회.
- **`getDataTable` / `setDataMatrix` / `setRecords`** — 시트와 레코드 배열(또는 2D 매트릭스) 간 입출력.
- **`copyCell` / `copyRow` / `copyCellStyle` / `copyRowStyle` / `insertCopyRow`** — 셀/행 복제·삽입(템플릿 시트 채울 때).
- **`setZoom` / `freezeAt`** — 시트 뷰 보기 설정(확대·틀 고정).
- **`setTabColor`** — 시트 탭 색 ARGB 지정.
- **`addConditionalFormat`** — 셀/범위에 조건부 서식 규칙 적용.
- **`addImage`** — 시트에 이미지(png/jpg 등) 삽입.
- **`ExcelCell`** — 단일 셀의 값·수식·스타일·병합.
- **`ExcelRow`** — 행 단위 셀 일괄 접근.
- **`ExcelCol`** — 열 단위 셀 접근 + 열 너비 설정.
- **`ExcelWrapper`** — Zod 스키마로 헤더·타입을 정의해 레코드 배열로 read/write.
- **`ExcelUtils`** — `"A1"`↔좌표, 범위 주소, Excel 직렬 날짜 ↔ 타임스탬프, numFmt 변환.
- **`ExcelValueType`** — 셀에 넣고 뺄 수 있는 값의 union (number/string/boolean/DateOnly/DateTime/Time/undefined).
- **`ExcelStyleOptions`** — `setStyle` / `setDefaultStyle` 입력 옵션 (배경·테두리·정렬·numFmt·폰트).
- **`ExcelFont`** — `ExcelStyleOptions.font` 의 폰트 속성(크기·family·bold·italic·underline·color·strike).
- **`ExcelConditionalRule` / `ExcelConditionalRuleStyle`** — `addConditionalFormat` 의 규칙·강조 스타일 타입.
- **`ExcelAddressPoint` / `ExcelAddressRangePoint`** — 0 기반 좌표 / 범위 좌표.
- **`ExcelNumberFormat` / `ExcelBorderPosition` / `ExcelHorizontalAlign` / `ExcelVerticalAlign` / `ExcelFontUnderline`** — 스타일 옵션의 enum literal 들.

## ExcelWorkbook
```typescript
new ExcelWorkbook(arg?: Blob | Bytes)
getWorksheetNames(): Promise<string[]>
addWorksheet(name): Promise<ExcelWorksheet>
getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet>  // 인덱스 0 기반
setDefaultStyle(opts: ExcelStyleOptions): Promise<void>              // fonts[0]/fills[0]/borders[0] 덮어쓰기, 모든 셀에 전역 적용
toBytes(): Promise<Bytes>
toBlob(): Promise<Blob>                                              // xlsx MIME
close(): Promise<void>                                               // 멱등, 이후 모든 메서드는 throw
```
패턴: `const wb = new ExcelWorkbook(bytes); try { ... } finally { await wb.close(); }`. 인자 생략 시 빈 워크북.

## ExcelWorksheet
```typescript
getName() / setName(newName)
row(r) / col(c) / cell(r, c)                                         // 모두 0 기반, 동기 반환
getRange(): Promise<ExcelAddressRangePoint>
getCells(): Promise<ExcelCell[][]>                                   // 전체 2D
getDataTable(opt?: { headerRowIndex?; checkEndColIndex?; usableHeaderNameFn? })
                                                                     // 레코드 배열. 중복 헤더면 throw
setDataMatrix(matrix: ExcelValueType[][])                            // 0,0 부터
setRecords(records: Record<string, ExcelValueType>[])                // 첫 행 헤더 자동
copyCell / copyRow / copyCellStyle / copyRowStyle / insertCopyRow
setZoom(percent) / freezeAt({ r?, c? }) / setTabColor(color)         // color: ARGB 8자리
addConditionalFormat({ ref, rules: ExcelConditionalRule[] })         // 호출마다 priority 누적
addImage({ bytes, ext, from, to? })                                  // ext 는 mime lookup. to 생략 시 from+1,+1
```

## ExcelCell / ExcelRow / ExcelCol
```typescript
// ExcelCell
cell.addr                                                            // { r, c }
getValue() / setValue(val: ExcelValueType)                           // string/number/boolean/DateOnly/DateTime/Time/undefined
getFormula() / setFormula(val)                                       // 셀 타입 "str" 로 설정
merge(endR, endC)                                                    // 현재 셀부터 (endR,endC) 까지
getStyleId() / setStyleId(id)
setStyle(opts: ExcelStyleOptions)                                    // 기존 스타일에 clone-merge

// ExcelRow / ExcelCol
row.cell(c) / col.cell(r)
row.getCells() / col.getCells()
col.setWidth(size)
```
값 setter 에 `undefined` → 셀 삭제. Date/Time 계열은 numFmt 자동 설정.

## ExcelWrapper
```typescript
new ExcelWrapper(schema: z.ZodObject)                                // .describe() 가 Excel 헤더명
read(file, wsNameOrIndex = 0, { excludes? }?): Promise<z.infer<S>[]> // 내부에서 워크북 close
write(wsName, records, { excludes? }?): Promise<ExcelWorkbook>       // 호출자가 close 필수
```
write: 모든 셀 테두리, 필수(non-optional/nullable/default) 비-boolean 필드 헤더는 노란 배경, 첫 행 freeze, 줌 85%.

## ExcelUtils
```typescript
stringifyAddr({r,c}) / parseCellAddr("B3")        // {r:2,c:1}
stringifyColAddr(0)  // "A"     parseColAddr("AA")  // 26
stringifyRangeAddr / parseRangeAddr("A1:C3")
convertTimeTickToNumber(tick) / convertNumberToTimeTick(serial)      // Excel 1899-12-30 기준
convertNumFmtIdToName / convertNumFmtCodeToName / convertNumFmtNameToId
```

## 타입 요약
- `ExcelValueType` = `number | string | DateOnly | DateTime | Time | boolean | undefined`.
- `ExcelStyleOptions`: `background`(ARGB 8자리), `border: ExcelBorderPosition[]`, `horizontalAlign`, `verticalAlign`, `numberFormat` (`"number"|"string"|"DateOnly"|"DateTime"|"Time"`), `numberFormatCode` (커스텀, 우선), `font: ExcelFont`.
- `ExcelFont`: `size, family, bold, italic, underline, color(ARGB), strike`. 미지정 속성은 OOXML 에 emit 안 됨 → Excel 기본값.
- `ExcelConditionalRule`: `{type:"cellIs", op, value, style}` | `{type:"text", op:"contains"|"notContains"|"beginsWith"|"endsWith", value, style}` | `{type:"expression", formula, style}`. `style` = `ExcelConditionalRuleStyle` (`background`, `fontColor`, `fontWeight`).
- `ExcelAddressPoint = {r,c}` / `ExcelAddressRangePoint = {s,e}` 모두 0 기반.
