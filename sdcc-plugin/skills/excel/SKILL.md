---
name: excel
description: "@simplysm/excel(XLSX/XLSB 읽기·쓰기, 셀 스타일·조건부 서식, zod 스키마 기반 ExcelWrapper)의 사용 안내. Use when 엑셀 파일 입출력이나 화면의 엑셀 다운로드·업로드 기능을 설계·spec·계획·작성·리뷰하는 모든 작업 — 착수 전에 먼저 읽는다. API 를 안다고 생각해도 읽는다(설치된 버전의 값 변환·리소스 규약이 학습 지식과 다르다). 대상: ExcelWorkbook·ExcelWorksheet·ExcelCell, ExcelWrapper(read·write·excludes), ExcelStyleOptions, addConditionalFormat, ExcelUtils(주소·날짜 serial·numFmt)."
---

@simplysm/excel 사용 안내입니다. ZIP 파트를 접근 시점에만 lazy-load 하는 자체 OOXML/BIFF12 구현이라 브라우저·Node 어디서나 동작합니다. `src/` 원본을 함께 배포하므로 상세 API 는 설치된 소스에서 직접 확인합니다 — 이 문서는 어디를 볼지와, 소스 한 파일만 읽어서는 놓치는 규약만 담습니다. 화면의 엑셀 양식·업로드 검증 규칙은 세션에 주입된 rules 가 정본입니다.

## 소스 위치

- 패키지 루트는 설치된 `node_modules/@simplysm/excel`, 소스는 `src/`. 공개 API 는 `src/index.ts` — `ExcelWorkbook`/`ExcelWorksheet`/`ExcelRow`/`ExcelCol`/`ExcelCell`, `ExcelWrapper`, `ExcelUtils`, 스타일·조건부 서식·값 타입, XML shape 타입(`ExcelXml*`, 내부 디버그용).

## 배선

- 읽기: `new ExcelWorkbook(bytesOrBlob)` → `getWorksheet(nameOrIndex)` → `getDataTable({ headerRowIndex?, checkEndColIndex?, usableHeaderNameFn? })` 또는 `cell(r, c).getValue()` → 끝나면 `close()`.
- 쓰기: `new ExcelWorkbook({ format? })` → `addWorksheet(name)` → `setRecords(records)`/`setDataMatrix(matrix)`/`cell().setValue()` → `setDefaultStyle`/`cell().setStyle`/`addConditionalFormat`/`freezeAt`/`setAutoFilter`/`addImage` → `toBytes()`/`toBlob()` → `close()`.
- `ExcelWrapper(zodObjectSchema)`: 각 필드의 `.describe("헤더명")` 이 Excel 헤더(없으면 필드 key). `read(file, wsNameOrIndex = 0, { excludes })` 가 헤더로 매핑·zod 검증한 레코드 배열, `write(wsName, records, { excludes })` 가 헤더+테두리+필수 헤더 노란 배경+`setZoom(85)`+첫 행 고정+자동 필터를 적용한 **열린** 워크북을 반환합니다. 화면의 다운로드(`write`)와 업로드(`read`)는 같은 스키마 인스턴스를 공유하고, 파생 컬럼(수정일시·수정자)은 `read` 의 `excludes` 로 뺍니다.

## 소스 한 파일만 읽어서는 틀리기 쉬운 것

- 워크북·시트·행·열·셀 메서드는 거의 전부 `async`(파트 lazy-load). 행·열 인덱스는 **0 기반**(`cell(0, 0)` = A1), 시트 인덱스도 0 기반. A1 주소 변환은 `ExcelUtils.parseCellAddr`/`stringifyAddr`.
- `ExcelWorkbook` 은 ZIP 리소스를 쥐고 있어 사용 후 `close()` 필수 — `ExcelWrapper.write` 가 돌려준 워크북도 호출자가 `toBlob()` 뒤 `finally` 에서 닫습니다(`read` 는 내부에서 닫음). `close()` 뒤 메서드 호출은 throw.
- `ExcelWrapper.read` 는 시트에 데이터가 없으면 throw, 매핑 대상 값이 전부 빈 행은 건너뜀, zod 검증 실패는 issue 경로·메시지를 합쳐 throw. 빈 셀은 `ZodDefault` 면 기본값, optional/nullable 이면 `undefined`, 필수 boolean 이면 `false`. `ZodNumber` 는 `num.parseFloat`, `ZodBoolean` 은 `"1"/"true"/"0"/"false"` 인식.
- `ExcelWrapper.write` 의 필수 헤더(노란 배경) 판정은 optional/nullable/default 가 아니고 boolean 도 아닌 필드.
- `setValue` 에 `DateOnly`/`DateTime`/`Time` 을 주면 Excel serial 숫자 + 해당 numFmt(14/22/18) 가 자동 적용되고, `getValue` 는 셀의 numFmt 로 다시 값 타입을 복원합니다. `undefined` 는 셀 삭제. 수식은 `setFormula` 로 두되 계산값은 저장되지 않습니다(Excel 이 열 때 평가). 에러 셀(`t="e"`) 은 `getValue` 가 throw.
- 색은 ARGB 8자리(`"00FF0000"`), 형식 검증 실패 시 throw. `numberFormatCode`(예 `"#,##0.00"`) 가 `numberFormat` 프리셋보다 우선. `cell.setStyle` 은 기존 styleId 가 있으면 clone 후 지정 필드만 덮고, `border` 배열에 없는 방향은 제거됩니다. `wb.setDefaultStyle` 은 0번 자원 슬롯을 통째로 덮습니다(옵션 없는 슬롯은 빈 값으로 reset).
- `addConditionalFormat({ ref, rules })` 는 호출마다 블록이 누적되고 priority 는 시트 전역 카운터. `text` 규칙은 SEARCH 기반(대소문자 무시) 고정, `expression` 은 raw 수식 그대로.
- `getDataTable` 은 중복 헤더면 throw. `setRecords` 는 모든 레코드 key 의 distinct 합집합을 헤더로 씁니다(빈 문자열 key 제외).
- `insertCopyRow` 는 대상 이하 행을 밀고 병합을 이동·확장합니다. `col(c).setWidth` 단위는 문자 수.
- 날짜 serial 은 1899-12-30 기준이며 `ExcelUtils.convertTimeTickToNumber` 가 타임존 오프셋을 빼고 계산합니다.
- 기존 파일 로드 시 `xl/workbook.bin` 유무로 xlsb/xlsx 를 판별합니다. 새 워크북은 `{ format: "xlsb" }` 를 주지 않으면 xlsx.
