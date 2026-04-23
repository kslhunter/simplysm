# @simplysm/excel

> Excel 워크북(xlsx) 읽기/쓰기 라이브러리. DOM 의존성이 없어 Node.js와 브라우저 양쪽에서 동작하는 neutral 패키지다.
> Lazy Loading 아키텍처로 대용량 파일도 메모리 효율적으로 처리한다.
> 의존성: `@simplysm/core-common`, `mime`, `zod`

## Installation

```bash
npm install @simplysm/excel
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| Excel 파일 생성/읽기/저장 | [ExcelWorkbook](./core-classes/excel-workbook.md) |
| 셀 값/수식/스타일 설정 | [ExcelCell](./core-classes/excel-cell.md) |
| 행/열 복사, 데이터 테이블, 이미지 삽입 | [ExcelWorksheet](./core-classes/excel-worksheet.md) |
| Zod 스키마 기반 타입 안전한 읽기/쓰기 | [ExcelWrapper](./wrapper/excel-wrapper.md) |
| 셀 주소 변환, 날짜↔숫자 변환 | [ExcelUtils](./utilities/excel-utils.md) |

## API Overview

### Core Classes

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ExcelWorkbook`](./core-classes/excel-workbook.md) | class | xlsx 파일을 열거나 새로 만들 때. 워크시트 조회/생성, 바이트 내보내기의 진입점 |
| [`ExcelWorksheet`](./core-classes/excel-worksheet.md) | class | 시트 내 셀/행/열 접근, 행 복사, 데이터 테이블 읽기/쓰기, 이미지 삽입이 필요할 때 |
| [`ExcelCell`](./core-classes/excel-cell.md) | class | 개별 셀의 값/수식/스타일/병합을 조작할 때 |
| [`ExcelRow`](./core-classes/excel-row.md) | class | 특정 행의 셀들을 일괄 접근할 때 |
| [`ExcelCol`](./core-classes/excel-col.md) | class | 특정 열의 셀들을 일괄 접근하거나 열 너비를 설정할 때 |

### Wrapper

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ExcelWrapper`](./wrapper/excel-wrapper.md) | class | Zod 스키마로 타입 안전한 Excel 읽기/쓰기가 필요할 때. 헤더 자동 생성, 유효성 검사 포함 |

### Utilities

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ExcelUtils`](./utilities/excel-utils.md) | class | 셀 주소 문자열↔좌표 변환, Excel 날짜 숫자↔JS 타임스탬프 변환이 필요할 때 |

### Types

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ExcelValueType`](./types/excel-value-type.md) | type | 셀 값의 타입을 지정할 때. `ExcelCellType`, `ExcelNumberFormat` 포함 |
| [`ExcelAddressPoint`](./types/excel-address-point.md) | interface | 셀 좌표를 전달할 때. `ExcelAddressRangePoint` 포함 |
| [`ExcelStyleOptions`](./types/excel-style-options.md) | interface | 셀 스타일(배경색, 테두리, 정렬, 숫자 형식)을 설정할 때 |
| [`ExcelXml`](./types/excel-xml.md) | interface | 내부 XML 처리 클래스의 공통 인터페이스 (직접 사용하지 않음) |
| [`ExcelXmlContentTypeData`](./types/excel-xml-content-type-data.md) | interface | 내부 `[Content_Types].xml` 데이터 구조 (직접 사용하지 않음) |
| [`ExcelXmlRelationshipData`](./types/excel-xml-relationship-data.md) | interface | 내부 `*.rels` 데이터 구조 (직접 사용하지 않음) |
| [`ExcelXmlWorkbookData`](./types/excel-xml-workbook-data.md) | interface | 내부 `workbook.xml` 데이터 구조 (직접 사용하지 않음) |
| [`ExcelXmlWorksheetData`](./types/excel-xml-worksheet-data.md) | interface | 내부 `worksheet*.xml` 데이터 구조 (직접 사용하지 않음) |
| [`ExcelXmlDrawingData`](./types/excel-xml-drawing-data.md) | interface | 내부 `drawing*.xml` 데이터 구조 (직접 사용하지 않음) |
| [`ExcelXmlSharedStringData`](./types/excel-xml-shared-string-data.md) | interface | 내부 `sharedStrings.xml` 데이터 구조 (직접 사용하지 않음) |
| [`ExcelXmlStyleData`](./types/excel-xml-style-data.md) | interface | 내부 `styles.xml` 데이터 구조 (직접 사용하지 않음) |

## 이 패키지를 쓰지 말아야 할 때

- xls(구형 바이너리 포맷) 파일 처리가 필요한 경우 -- xlsx만 지원한다
- CSV 파일만 처리하면 되는 경우 -- 별도 CSV 파서가 더 적합하다
