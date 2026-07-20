# @simplysm/sd-excel — Low-level (OOXML 파트)

워크북을 구성하는 각 OOXML 파트를 객체로 표현하는 저수준 클래스 묶음.
고수준 API(`SdExcelWorkbook`/`Worksheet`/`Cell`)가 내부에서 이들을 조작함.
`workbook.zipCache.getAsync(path)` 로 직접 파트를 꺼내 쓸 때만 필요.

## 공통 인터페이스

- `ISdExcelXml { readonly data: any; cleanup(): void }` — 모든 XML 파트 객체의 공통형.
  - `data` 는 파싱된 트리, `cleanup()` 은 직렬화 직전 정렬/정리 훅(ZipCache.toBufferAsync 가 호출).

## ZipCache

`workbook.zipCache` 로 노출. 파트 경로→(XML객체|Buffer|undefined) 캐시 + `SdZip` 래핑.

- `new ZipCache(arg?: Blob | Buffer)` — 기존 파일 로드 또는 빈 zip.
- `getAsync(filePath: string): Promise<ISdExcelXml | Buffer | undefined>` — 파트 조회.
  - `.xml`/`.rels` 는 경로별로 적합한 SdExcelXml* 클래스로 래핑(미인식 경로는 SdExcelXmlUnknown), 그 외는 Buffer.
  - 없으면 undefined 캐시 후 반환.
- `existsAsync(filePath): Promise<boolean>` — 캐시 또는 zip 에 존재하는지.
- `set(filePath, content: ISdExcelXml | Buffer): void` — 파트 교체/추가(동기).
- `toBufferAsync(): Promise<Buffer>` — 캐시의 모든 XML 객체 cleanup 후 직렬화, 압축.
- `closeAsync(): Promise<void>` — zip 닫고 캐시 clear.

## SdExcelXmlWorkbook (`xl/workbook.xml`)

- `lastWsRelId: number | undefined` (getter) — 시트들 중 최대 r:id.
- `sheetNames: string[]` (getter) — 시트명 배열.
- `addWorksheet(name): this` — 시트 등록(이름의 `: \ / ? * [ ] '` → `_` 치환, r:id=last+1).
- `getWsRelIdByName(name): number | undefined` / `getWsRelIdByIndex(index): number | undefined` — 이름/0-base 인덱스 → r:id.
- `getWorksheetNameById(id): string | undefined` / `setWorksheetNameById(id, newName)` — r:id 기준 시트명 조회/변경.
- `initializeView()` — bookViews 없으면 기본 추가(줌, 틀고정 전 호출).
- `cleanup()` — 직렬화 순서 정렬(bookViews→sheets).

## SdExcelXmlWorksheet (`xl/worksheets/sheetN.xml`)

셀 좌표는 0-base `{r,c}`. 내부 dataMap 으로 행/셀 캐싱.

- `range: ISdExcelAddressRangePoint` (getter) — `s:{0,0}`-최대 셀.
- `setCellType(addr, type: "s"|"b"|"str"|undefined)` / `getCellType(addr): string | undefined` — 셀 타입(s=sharedString, b=bool, str=수식문자열). undefined 면 속성 제거.
- `setCellVal(addr, val: string | undefined)` / `getCellVal(addr): string | undefined` — 셀 raw 값(v 또는 inlineStr).
- `setCellFormula(addr, val: string | undefined)` / `getCellFormula(addr): string | undefined` — 수식(f).
- `getCellStyleId(addr): string | undefined` / `setCellStyleId(addr, styleId)` — 셀 s(styleId).
- `deleteCell(addr)` — 셀 제거(행에 셀 0개면 행도 제거).
- `clearCellValue(addr)` — 값/수식/inlineStr/타입만 삭제, styleId(테두리 등) 보존.
- `setMergeCells(startAddr, endAddr)` — 병합 추가(기존과 겹치면 throw, 시작셀 외 값 clear).
- `getMergeCells(): {s,e}[]` / `removeMergeCells(fromAddr, toAddr)` — 병합 목록 조회/범위내 병합 제거.
- `setColWidth(colIndex: string, width: string)` — 1-base 문자열 열번호의 너비 지정(필요시 col 구간 분할).
- `setZoom(percent)` / `setFix(point: {r?,c?})` — 줌, 틀고정 (고수준 setZoomAsync/setFixAsync 가 호출).
- `insertEmptyRow(row)` — 빈 행 삽입+이하 행, 병합 shift.
- `copyRow(sourceR, targetR)` / `copyCell(sourceAddr, targetAddr)` — 행/셀 데이터(+행은 병합) 복제.
- `cleanup()` — 파트 순서, 행/셀 정렬, dimension ref 재계산.

## SdExcelXmlSharedString (`xl/sharedStrings.xml`)

- `getIdByString(str): number | undefined` — 문자열의 기존 인덱스(스타일 없는 si 만 매칭).
- `getStringById(id): string | undefined` — 인덱스 → 문자열(리치텍스트 r 조각은 join).
- `add(str): number` — 새 문자열 추가하고 인덱스 반환.

## SdExcelXmlStyle (`xl/styles.xml`)

`ISdExcelStyle` 단위로 스타일 추가, 동일 정의는 재사용(중복 방지).

- `ISdExcelStyle` 필드:
  - `numFmtId?: string` — 내장 숫자서식 id.
  - `numFmtCode?: string` — 커스텀 서식코드(등록 후 id 부여, applyNumberFormat=1).
  - `border?: ("left"|"right"|"top"|"bottom")[]` — thin 검정 테두리 방향.
  - `background?: string` — 배경색 `AARRGGBB`(solid patternFill).
  - `verticalAlign?: "center"|"top"|"bottom"` / `horizontalAlign?: "center"|"left"|"right"` — 정렬.
- `add(style: ISdExcelStyle): string` — 새 xf 추가(동일하면 기존 인덱스 반환), styleId 반환.
- `addWithClone(id: string, style: ISdExcelStyle): string` — 기존 xf(id) 복제 후 변경분 적용한 styleId 반환(기존 서식 위에 누적).
- `get(id: string): ISdExcelStyle` — styleId 의 현재 스타일 역구성.
- `getNumFmtCode(numFmtId: string): string | undefined` — id 에 등록된 커스텀 서식코드.
- `cleanup()` — numFmts 를 styleSheet 최상단으로 정렬.

## SdExcelXmlDrawing (`xl/drawings/drawingN.xml`)

- `addPicture(opts: { from, to, blipRelId })` — twoCellAnchor 그림(셀 범위 추종). from/to=`{r,c,rOff?,cOff?}`(EMU 오프셋), blipRelId=`rIdN`(미디어 관계).
- `addOneCellPicture(opts: { r, c, width, height, left?, top?, blipRelId })` — oneCellAnchor 그림(고정 크기). width/height/left/top 은 px → ×9525 EMU 변환.

## SdExcelXmlContentType (`[Content_Types].xml`)

- `add(partName: string, contentType: string): this` — Override 항목 추가(중복 partName 무시).

## SdExcelXmlRelationShip (`*.rels`)

- `getTargetByRelId(rId: number): string | undefined` — rId → Target 경로.
- `add(target, type): this` — 관계 추가(id 자동).
- `addAndGetId(target, type): number` — 추가 후 부여된 숫자 id 반환.
- `insert(rId: number, target, type): this` — 지정 rId 위치에 삽입(이상 id 들 +1 shift).

## SdExcelXmlUnknown

- `new SdExcelXmlUnknown(data)` — 위 어느 클래스에도 매칭 안 되는 XML 파트를 원본 그대로 보존(cleanup 무동작).
