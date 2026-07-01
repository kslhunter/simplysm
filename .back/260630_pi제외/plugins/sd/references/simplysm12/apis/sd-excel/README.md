# @simplysm/sd-excel

브라우저/Node 양쪽에서 xlsx(OOXML) 파일을 읽고 쓰고 셀 단위로 조작하는 모듈. 0-base `{r,c}` 좌표로 셀에 접근하며, 모든 I/O는 async.

## 사용 트리거 인덱스

- **SdExcelWorkbook** — 엑셀 파일을 새로 만들거나(생성자 인자 없음) Buffer/Blob 로 열고(생성자 인자 있음), 시트 생성·조회·Buffer/Blob 출력할 때.
- **SdExcelWorksheet** — 시트명 변경, 셀/행/열 접근, 행 복사·삽입, 데이터테이블/레코드 읽기쓰기, 줌·틀고정·이미지 삽입 등 시트 전체 조작.
- **SdExcelCell** — 단일 셀의 값/수식 읽기쓰기, 병합, 스타일(배경·테두리·정렬·숫자서식) 지정.
- **SdExcelRow / SdExcelCol** — 한 행/열 단위로 셀 묶음을 다루거나 열 너비를 지정할 때.
- **TSdExcelValueType / TSdExcelNumberFormat / 주소 인터페이스** — 셀 값 타입과 숫자서식 식별자, 좌표 구조체. (아래 인라인)
- **SdExcelUtils** — 셀 주소 문자열↔좌표 변환, 엑셀 날짜수↔tick 변환, 숫자서식 id↔name 변환이 필요할 때. (아래 인라인)
- **SdExcelWrapper** — 필드 스키마(표시명·타입·필수)를 정의해 객체 배열을 시트로 쓰거나, 시트를 타입검증된 객체 배열로 읽을 때. 자세히: [wrapper.md](./wrapper.md)
- **SdExcelReader (legacy)** — 읽기 전용. `.xls`(BIFF) 등 레거시/구버전 포맷을 codepage 949 로 빠르게 파싱할 때 (xlsx 라이브러리 기반). 자세히: [legacy-reader.md](./legacy-reader.md)
- **XML 헬퍼 / ZipCache / ISdExcelXml** — OOXML 파트 XML 을 직접 조작하는 저수준 빌딩블록. 위 고수준 API 로 안 되는 경우만. 자세히: [low-level.md](./low-level.md)

## SdExcelWorkbook

엑셀 파일 1개 = 워크북 1개. `zipCache: ZipCache` 필드는 모든 파트를 캐싱하는 내부 zip 핸들(저수준 접근 시 사용).

- `new SdExcelWorkbook(arg?: Blob | Buffer)` — arg 있으면 기존 파일 열기, 없으면 빈 워크북(ContentTypes/rels/workbook 기본 파트 자동 생성).
- `getWorksheetNames(): Promise<string[]>` — 워크북 내 시트명 배열(정의 순서).
- `createWorksheetAsync(name: string): Promise<SdExcelWorksheet>` — 새 시트 추가 후 핸들 반환. workbook/contentTypes/rels/worksheet 파트를 모두 갱신.
- `getWorksheetAsync(nameOrIndex: string | number): Promise<SdExcelWorksheet>` — 이름(string) 또는 0-base 인덱스(number)로 시트 조회. 없으면 throw. 같은 시트는 캐시 재사용.
- `addMediaAsync(buffer: Buffer, ext: string): Promise<string>` — 워크북 레벨로 미디어(이미지) 추가, 저장경로(`xl/media/imageN.ext`) 반환. ext 의 mime 미확인 시 throw. (시트에 그림을 앵커링하려면 워크시트의 addImageAsync/addDrawingAsync 사용)
- `getBufferAsync(): Promise<Buffer>` — 현재 상태를 압축해 Buffer 로. 저장용.
- `getBlobAsync(): Promise<Blob>` — 위와 동일하나 spreadsheet mime 의 Blob 으로. 브라우저 다운로드용.
- `closeAsync(): Promise<void>` — 내부 zip 닫고 캐시 비움.

## SdExcelWorksheet

좌표는 모두 0-base (`r:0,c:0` = A1).

- `getNameAsync(): Promise<string>` / `setNameAsync(newName): Promise<void>` — 시트명 조회/변경. 변경 시 `: \ / ? * [ ] '` 문자는 `_` 로 치환됨.
- `row(r): SdExcelRow` / `col(c): SdExcelCol` / `cell(r, c): SdExcelCell` — 동기 핸들 반환(실제 I/O 는 핸들 메서드 호출 시). cell 은 `row(r).cell(c)` 단축.
- `getRangeAsync(): Promise<ISdExcelAddressRangePoint>` — 데이터가 있는 범위. 항상 `s:{r:0,c:0}` 부터 최대 행·열까지.
- `getCellsAsync(): Promise<SdExcelCell[][]>` — range 전체를 행×열 2차원 셀 핸들 배열로.
- `getDataTableAsync(opt?): Promise<Record<string, any>[]>` — 헤더행 기준으로 레코드 배열 추출. opt:
  - `headerRowIndex?: number` — 헤더로 쓸 행 인덱스(기본: range 시작행).
  - `checkEndColIndex?: number` — 이 열의 값이 undefined 인 행에서 읽기 중단(데이터 끝 판정).
  - `usableHeaderNameFn?: (headerName: string) => boolean` — true 인 헤더만 컬럼으로 채택.
- `setDataMatrixAsync(matrix: TSdExcelValueType[][]): Promise<void>` — 2차원 배열을 (0,0)부터 그대로 셀에 기록.
- `setRecords(record: Record<string, any>[]): Promise<void>` — 객체배열을 헤더(0행)+데이터(1행~)로 기록. 헤더는 전체 키 distinct, 빈문자열 제외.
- `copyRowStyleAsync(srcR, targetR): Promise<void>` — range 전체 열에 걸쳐 행 스타일만 복사.
- `copyCellStyleAsync(srcAddr:{r,c}, targetAddr:{r,c}): Promise<void>` — 셀 styleId 복사(값 제외).
- `copyRowAsync(srcR, targetR): Promise<void>` — 행 데이터+병합을 target 으로 복제(target 기존 내용 대체).
- `copyCellAsync(srcAddr:{r,c}, targetAddr:{r,c}): Promise<void>` — 셀 데이터 복제.
- `insertEmptyRowAsync(row): Promise<void>` — 해당 위치에 빈 행 삽입(이하 행·병합 모두 +1 shift).
- `insertCopyRowAsync(srcR, targetR): Promise<void>` — targetR 에 빈 행 삽입 후 srcR(shift 보정 적용) 행을 복사. 서식 유지 행 삽입에 사용.
- `setZoomAsync(percent: number): Promise<void>` — 시트 확대율(%). bookViews 도 초기화.
- `setFixAsync(point: { r?: number; c?: number }): Promise<void>` — 틀 고정. r 만 주면 상단 행 고정, c 만 주면 좌측 열 고정, 둘 다 주면 양쪽. 값은 "고정할 마지막 0-base 인덱스".
- `addImageAsync(opts): Promise<void>` — twoCellAnchor(셀 범위에 맞춰 늘어나는) 그림 삽입. opts:
  - `buffer: Buffer` / `ext: string` — 이미지 바이트와 확장자(mime 판정용, 미확인 시 throw).
  - `from: { r, c, rOff?, cOff? }` — 시작 셀 좌표 + 셀내 오프셋(EMU, 기본 0).
  - `to?: { r, c, rOff?, cOff? }` — 끝 셀 좌표. 생략 시 `{r:from.r+1, c:from.c+1}`.
- `addDrawingAsync(opts): Promise<void>` — oneCellAnchor(고정 픽셀 크기) 그림 삽입. opts:
  - `buffer / ext` — 위와 동일.
  - `r, c: number` — 앵커 셀 좌표.
  - `width, height: number` — 픽셀 크기(내부에서 ×9525 EMU 변환).
  - `left?, top?: number` — 셀 기준 픽셀 오프셋(기본 0, ×9525 변환).

## SdExcelCell

`addr: { r, c }` 필드로 자기 좌표 노출. 값 입출력은 type/numFmt 를 자동 처리.

- `setValAsync(val: TSdExcelValueType): Promise<void>` — 값 기록. 타입별: string→sharedString, boolean→"1"/"0", number→그대로, DateOnly/DateTime/Time→날짜수+해당 numFmt 자동지정, undefined→셀 삭제. 그 외 타입은 throw.
- `getValAsync(): Promise<TSdExcelValueType>` — 셀 타입/스타일 numFmt 를 보고 number/string/boolean/DateOnly/DateTime/Time 로 복원. 빈값→undefined, 에러셀(t="e")→throw.
- `setFormulaAsync(val: string | undefined): Promise<void>` — 수식 문자열 기록(셀 type "str", 기존 값 제거). undefined→셀 삭제.
- `mergeAsync(r: number, c: number): Promise<void>` — 이 셀을 시작으로 (r,c)까지 병합. 기존 병합과 겹치면 throw. 시작셀 외 값은 제거(스타일 보존).
- `getStyleIdAsync(): Promise<string | undefined>` / `setStyleIdAsync(styleId: string | undefined): Promise<void>` — 셀 styleId(cellXfs 인덱스) 직접 조회/지정.
- `style.*` — 스타일 지정 묶음(아래). 기존 styleId 있으면 clone 후 변경, 없으면 새로 생성.
  - `setBackgroundAsync(color: string)` — 배경색. color 는 `AARRGGBB` 8자리 hex(alpha 역순+rgb), 형식 불일치 시 throw. 예: `"00FFFF00"`(노랑).
  - `setBorderAsync(directions: ("left"|"right"|"top"|"bottom")[])` — 지정 방향에 thin 검정 테두리.
  - `setVerticalAlignAsync(align: "center"|"top"|"bottom")` — 세로 정렬.
  - `setHorizontalAlignAsync(align: "center"|"left"|"right")` — 가로 정렬.
  - `setFormatPresetAsync(format: TSdExcelNumberFormat | "ThousandsSeparator" | "0%" | "0.00%")` — 프리셋 숫자서식. `"ThousandsSeparator"`→numFmtId 41(천단위쉼표), `"0%"`→9, `"0.00%"`→10, 그 외(number/string/DateOnly/DateTime/Time)는 name→id 매핑.
  - `setNumFormatIdAsync(numFmtId: string)` — 내장 numFmtId 직접 지정.
  - `setNumFormatCodeAsync(numFmtCode: string)` — 커스텀 서식코드 지정(styles 에 numFmt 등록).

## SdExcelRow / SdExcelCol

- `SdExcelRow.cell(c): SdExcelCell` — 이 행의 c 열 셀.
- `SdExcelRow.getCellsAsync(): Promise<SdExcelCell[]>` — range 너비만큼 셀 배열(인덱스=열번호).
- `SdExcelCol.cell(r): SdExcelCell` — 이 열의 r 행 셀.
- `SdExcelCol.getCellsAsync(): Promise<SdExcelCell[]>` — range 높이만큼 셀 배열(인덱스=행번호).
- `SdExcelCol.setWidthAsync(size: number): Promise<void>` — 열 너비 지정(엑셀 width 단위).

## 값/서식 타입과 좌표 (types)

- `TSdExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined` — 셀이 주고받는 값 타입. undefined 는 빈 셀.
- `TSdExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time"` — 셀 해석 분류. number=숫자, string=텍스트, 나머지=날짜/시간.
- `sdExcelNumberFormats: TSdExcelNumberFormat[]` — 위 리터럴 5종의 런타임 배열.
- `ISdExcelAddressPoint { r: number; c: number }` — 단일 셀 좌표(0-base).
- `ISdExcelAddressRangePoint { s: ISdExcelAddressPoint; e: ISdExcelAddressPoint }` — 시작(s)~끝(e) 범위. getRangeAsync 반환형.

## SdExcelUtils

좌표·날짜·서식 변환 정적 유틸. 직접 XML 다룰 때나 주소 계산에 사용.

- `stringifyAddr(point: {r,c}): string` — `{r:0,c:0}` → `"A1"`.
- `stringifyRowAddr(r): string` — 0-base 행 → 1-base 문자열.
- `stringifyColAddr(c): string` — 0-base 열 → `"A"`,`"B"`…`"AA"`.
- `parseRowAddrCode(addrCode): number` / `parseColAddrCode(addrCode): number` — 주소문자열에서 0-base 행/열 추출.
- `parseCellAddrCode(addr): {r,c}` — `"A1"` → `{r:0,c:0}`.
- `parseRangeAddrCode(rangeAddr): {s:{r,c}, e:{r,c}}` — `"A1:B2"` 파싱(콜론 없으면 s=e).
- `stringifyRangeAddr(point: {s,e}): string` — 범위 → `"A1:B2"`(s===e 면 단일주소).
- `convertTimeTickToNumber(tick): number` — JS tick → 엑셀 날짜 일련번호(로컬 타임존 보정 포함).
- `convertNumberToTimeTick(num): number` — 엑셀 날짜 일련번호 → JS tick.
- `convertNumFmtCodeToName(numFmtCode): TSdExcelNumberFormat` — 서식코드 문자열 분석해 분류명으로(미인식 코드 throw).
- `convertNumFmtIdToName(numFmtId): TSdExcelNumberFormat` — 내장 numFmtId(숫자) → 분류명(미인식 id throw).
- `convertNumFmtNameToId(numFmtName): number` — 분류명 → 대표 내장 id (number→0, DateOnly→14, DateTime→22, Time→18, string→49).
