# @simplysm/sd-excel — Legacy Reader

`xlsx`(SheetJS) 라이브러리 기반의 **읽기 전용** 파서. codepage 949(EUC-KR)와 cpexcel 테이블을 미리 로드해 `.xls`(BIFF) 등 레거시/구버전 한글 인코딩 파일을 경고 없이 파싱함. 신규 작성/수정은 고수준 `SdExcelWorkbook` 을 쓰고, 이 군은 구포맷 읽기에만 사용함.

## SdExcelReader

- `new SdExcelReader(data: Buffer)` — Buffer 를 codepage 949 로 읽어 워크북 로드.
- `sheetNames: string[]` (getter) — 시트명 배열.
- `getWorkSheet(name: string): SdExcelReaderWorksheet` / `getWorkSheet(index: number): SdExcelReaderWorksheet` — 이름 또는 0-base 인덱스로 시트 핸들. 없으면 throw.

## SdExcelReaderWorksheet

- `range: XLSX.Range` (getter) — 시트 데이터 범위(`!ref` 디코드, 0-base s/e).
- `val(r: number, c: number): string | number | boolean | Date | undefined` — 0-base 좌표 셀 원값. 셀 없음/빈문자열→undefined.
- `dataTable(startRow?, startCol?, endRow?, endCol?): SdExcelReaderDataTable` — 범위를 지정해 데이터테이블 생성. 각 인자 생략 시 range 끝값 사용, 음수면 range 끝에서 상대(`range.e + 음수`) 계산.

## SdExcelReaderDataTable

생성자에서 범위 첫 행을 헤더로 삼아 헤더명→열 맵 구성(헤더 중복 시 throw "컬럼중복").

- `rowLength: number` (getter) — 헤더 제외 데이터 행 수(`e.r - s.r`).
- `headers: (string | undefined)[]` (getter) — 열 인덱스 위치에 헤더명이 들어간 배열.
- `val(r: number, colName: string): any` — 0-base 데이터행 r(헤더 다음 행이 0)의 해당 컬럼값. 없는 컬럼명→undefined.
- `map<R>(cb: (r: number) => R, filterCb?: (r: number) => boolean): R[]` — 데이터 행들을 순회 매핑. cb/filterCb 의 r 은 시트상의 실제 행 인덱스(헤더 다음 행부터 range 끝까지).
- `mapMany<R>(cb: (r: number) => R[], filterCb?): R[]` — map 과 동일하나 cb 결과 배열을 평탄화.
