# @simplysm/excel

OOXML(.xlsx) 워크북을 ZIP 단위 lazy-load 로 읽고 쓰는 라이브러리. 대용량 파일에서도 접근한 셀에 필요한 XML 파트만 로드한다(모든 셀 메서드가 `async` 인 이유). 워크북 생성·시트 추가·셀 값/스타일·조건부 서식·이미지 삽입·Zod 스키마 기반 레코드 매핑을 제공한다.

## 사용 트리거 인덱스

- **ExcelWorkbook / ExcelWorksheet** — .xlsx 파일을 열거나 새로 만들고 시트를 다루며 바이트로 내보낼 때. 시트 단위 데이터 테이블·매트릭스·이미지·뷰(zoom/freeze) 처리 포함. 자세히: [workbook-worksheet.md](./workbook-worksheet.md)
- **ExcelCell / ExcelRow / ExcelCol** — 개별 셀의 값·수식·병합·스타일을 읽고 쓰거나 행/열 단위로 셀을 순회할 때. 자세히: [cell.md](./cell.md)
- **셀 스타일 (ExcelStyleOptions / ExcelFont)** — 셀 또는 워크북 default 의 배경·테두리·정렬·숫자형식·폰트를 지정할 때. 자세히: [style.md](./style.md)
- **조건부 서식 (ExcelConditionalRule / ExcelConditionalRuleStyle)** — 셀/범위에 값 비교·텍스트 매칭·수식 기반 native CF 규칙을 추가할 때. 자세히: [conditional-format.md](./conditional-format.md)
- **ExcelWrapper** — Zod 스키마로 헤더 매핑·타입 변환·유효성 검사를 자동화해 레코드 배열 ↔ Excel 을 변환할 때. 자세히: [wrapper.md](./wrapper.md)
- **ExcelUtils** — 셀 주소(A1 ↔ 좌표) 변환, Excel 날짜 시리얼 ↔ 타임스탬프 변환, 숫자형식 코드/ID/이름 상호 변환이 필요할 때. 자세히: [utils.md](./utils.md)
- **값/주소/형식 타입** — 셀 값 유니온·숫자형식 프리셋·셀 타입·주소 좌표 타입을 시그니처에서 참조할 때. 아래 인라인 섹션 참조.
- **OOXML XML-shape 타입** — `ExcelXml*` / `Excel*Data` 류. 라이브러리 내부 XML 파서/직렬화기가 쓰는 OOXML 노드 구조 타입. 아래 인라인 섹션 참조.

## 값/주소/형식 타입

`./types` 가 노출하는 사용자 대면 타입. 셀 값을 다루거나 메서드 시그니처를 해석할 때 참조.

- `ExcelValueType` = `number | string | DateOnly | DateTime | Time | boolean | undefined` — 셀이 가질 수 있는 값 유니온. `getValue()` 반환·`setValue()` 인자 타입. `undefined` = 빈 셀(읽기 시 값 없음, 쓰기 시 셀 삭제).
- `ExcelNumberFormat` = `"number" | "string" | "DateOnly" | "DateTime" | "Time"` — 숫자형식 프리셋 이름. 셀의 numFmt 를 의미 단위로 분류한 값. `"number"` = 일반 수치, `"string"` = 텍스트 형식, 나머지는 날짜/시간 시리얼 해석에 사용.
- `ExcelCellType` = `"s" | "b" | "str" | "n" | "inlineStr" | "e"` — OOXML 셀 `t` 속성. `"s"` = SharedString 인덱스 참조, `"b"` = boolean, `"str"` = 수식 결과 문자열, `"n"` = 숫자, `"inlineStr"` = 인라인 서식 텍스트, `"e"` = 에러(읽기 시 throw). 보통 직접 다루지 않고 `getValue`/`setValue` 가 자동 처리.
- `ExcelAddressPoint` = `{ r: number; c: number }` — 0 기반 행(`r`)·열(`c`) 좌표. 셀 단일 위치 단위.
- `ExcelAddressRangePoint` = `{ s: ExcelAddressPoint; e: ExcelAddressPoint }` — 범위 좌표. `s` = 시작(좌상단), `e` = 끝(우하단). `getRange()` 반환 타입.
- `ExcelBorderPosition` = `"left" | "right" | "top" | "bottom"` — 테두리 적용 변. `ExcelStyleOptions.border` 배열 원소.
- `ExcelHorizontalAlign` = `"center" | "left" | "right"` — 가로 정렬.
- `ExcelVerticalAlign` = `"center" | "top" | "bottom"` — 세로 정렬.
- `ExcelFontUnderline` = `"single" | "double" | "singleAccounting" | "doubleAccounting"` — 밑줄 종류. OOXML `<u val="...">` 의 val 에 그대로 매핑.

## OOXML XML-shape 타입

`./types` 가 함께 export 하는 다음 인터페이스·타입은 라이브러리 내부 XML 파서/직렬화기가 OOXML 파트의 파싱 결과(`xml2js` 스타일의 `$`=속성, 배열 래핑) 구조를 표현하는 데이터 모델이다. 일반 사용 흐름(값/스타일/시트 API)에서는 직접 다루지 않으며, OOXML 노드를 직접 조작·검증할 때만 참조한다.

- `ExcelXmlContentTypeData` — `[Content_Types].xml` 의 `Types`(Default/Override 파트 등록) 구조.
- `ExcelXmlRelationshipData` / `ExcelRelationshipData` — `*.rels` 의 `Relationships` 및 개별 `Relationship`(Id/Target/Type) 구조.
- `ExcelXmlWorkbookData` — `xl/workbook.xml` 의 `workbook`(bookViews/sheets 등) 구조.
- `ExcelXmlWorksheetData` — `xl/worksheets/sheetN.xml` 의 `worksheet`(sheetPr/dimension/sheetViews/cols/sheetData/mergeCells/conditionalFormatting/drawing 등) 구조.
- `ExcelXmlConditionalFormattingData` / `ExcelXmlCfRuleData` — `<conditionalFormatting>` 블록과 `<cfRule>`(type/operator/priority/dxfId/formula) 구조. `ExcelXmlCfRuleData["$"]["type"|"operator"]` 는 규칙 spec 빌드 시 내부적으로 참조된다.
- `ExcelRowData` / `ExcelCellData` — `<row r="..">` 과 `<c r=".." s=".." t="..">`(v=값, f=수식, is=인라인 문자열) 구조.
- `ExcelXmlDrawingData` — `xl/drawings/drawingN.xml` 의 `wsDr`(twoCellAnchor/pic/blipFill/spPr 등 이미지 앵커) 구조.
- `ExcelXmlSharedStringData` / `ExcelXmlSharedStringDataSi` / `ExcelXmlSharedStringDataText` — `xl/sharedStrings.xml` 의 `sst` 와 `si` 항목(단순 `t` 또는 서식 run `r[]`), 텍스트 노드(`space="preserve"` 보존) 구조.
- `ExcelXmlStyleData` 및 하위(`...Font` / `...Fill` / `...Border` / `...Xf` / `...Dxf`) — `xl/styles.xml` 의 `styleSheet`(numFmts/fonts/fills/borders/cellXfs/dxfs) 와 각 자원 노드 구조.
- `ExcelXml` = `{ readonly data: unknown; cleanup(): void }` — 모든 XML 파트 래퍼가 따르는 공통 인터페이스. `data` = 파싱된 노드 트리, `cleanup()` = 직렬화 전 마무리 정리.
