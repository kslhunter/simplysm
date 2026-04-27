# API Index — @simplysm/excel

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Core Classes

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ExcelWorkbook` | class | [excel-workbook.md](./core-classes/excel-workbook.md) | xlsx 파일을 열거나 새로 만들 때 |
| `ExcelWorksheet` | class | [excel-worksheet.md](./core-classes/excel-worksheet.md) | 시트 내 셀/행/열 접근, 행 복사, 데이터 테이블, 이미지 삽입이 필요할 때 |
| `ExcelCell` | class | [excel-cell.md](./core-classes/excel-cell.md) | 개별 셀의 값/수식/스타일/병합을 조작할 때 |
| `ExcelRow` | class | [excel-row.md](./core-classes/excel-row.md) | 특정 행의 셀들을 일괄 접근할 때 |
| `ExcelCol` | class | [excel-col.md](./core-classes/excel-col.md) | 특정 열의 셀들을 일괄 접근하거나 열 너비를 설정할 때 |

## Wrapper

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ExcelWrapper` | class | [excel-wrapper.md](./wrapper/excel-wrapper.md) | Zod 스키마로 타입 안전한 Excel 읽기/쓰기가 필요할 때 |

## Utilities

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ExcelUtils` | class | [excel-utils.md](./utilities/excel-utils.md) | 셀 주소 변환, 날짜↔숫자 변환이 필요할 때 |

## Types

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ExcelValueType` | type | [excel-value-type.md](./types/excel-value-type.md) | 셀 값의 타입을 지정할 때 |
| `ExcelCellType` | type | [excel-value-type.md](./types/excel-value-type.md) | Excel 셀 타입을 확인할 때 |
| `ExcelNumberFormat` | type | [excel-style-options.md](./types/excel-style-options.md) | 숫자 형식 프리셋을 지정할 때 |
| `ExcelAddressPoint` | interface | [excel-address-point.md](./types/excel-address-point.md) | 셀 좌표를 전달할 때 |
| `ExcelAddressRangePoint` | interface | [excel-address-point.md](./types/excel-address-point.md) | 셀 범위 좌표를 전달할 때 |
| `ExcelStyleOptions` | interface | [excel-style-options.md](./types/excel-style-options.md) | 셀 스타일을 설정할 때 |
| `ExcelBorderPosition` | type | [excel-style-options.md](./types/excel-style-options.md) | 테두리 위치를 지정할 때 |
| `ExcelHorizontalAlign` | type | [excel-style-options.md](./types/excel-style-options.md) | 가로 정렬을 지정할 때 |
| `ExcelVerticalAlign` | type | [excel-style-options.md](./types/excel-style-options.md) | 세로 정렬을 지정할 때 |
| `ExcelXmlContentTypeData` | interface | [xml-data-types.md](./types/xml-data-types.md) | xlsx content type XML 구조를 타입으로 다룰 때 |
| `ExcelXmlRelationshipData` | interface | [xml-data-types.md](./types/xml-data-types.md) | xlsx relationship XML 구조를 타입으로 다룰 때 |
| `ExcelRelationshipData` | interface | [xml-data-types.md](./types/xml-data-types.md) | 단일 relationship 항목 구조를 타입으로 다룰 때 |
| `ExcelXmlWorkbookData` | interface | [xml-data-types.md](./types/xml-data-types.md) | workbook XML 구조를 타입으로 다룰 때 |
| `ExcelXmlWorksheetData` | interface | [xml-data-types.md](./types/xml-data-types.md) | worksheet XML 구조를 타입으로 다룰 때 |
| `ExcelRowData` | interface | [xml-data-types.md](./types/xml-data-types.md) | worksheet row XML 구조를 타입으로 다룰 때 |
| `ExcelCellData` | interface | [xml-data-types.md](./types/xml-data-types.md) | worksheet cell XML 구조를 타입으로 다룰 때 |
| `ExcelXmlDrawingData` | interface | [xml-data-types.md](./types/xml-data-types.md) | drawing XML 구조를 타입으로 다룰 때 |
| `ExcelXmlSharedStringData` | interface | [xml-data-types.md](./types/xml-data-types.md) | shared string XML 구조를 타입으로 다룰 때 |
| `ExcelXmlSharedStringDataSi` | type | [xml-data-types.md](./types/xml-data-types.md) | shared string item 구조를 타입으로 다룰 때 |
| `ExcelXmlSharedStringDataText` | type | [xml-data-types.md](./types/xml-data-types.md) | shared string text node 구조를 타입으로 다룰 때 |
| `ExcelXmlStyleData` | interface | [xml-data-types.md](./types/xml-data-types.md) | style XML 구조를 타입으로 다룰 때 |
| `ExcelXmlStyleDataXf` | interface | [xml-data-types.md](./types/xml-data-types.md) | cell format XML 구조를 타입으로 다룰 때 |
| `ExcelXmlStyleDataFill` | interface | [xml-data-types.md](./types/xml-data-types.md) | fill style XML 구조를 타입으로 다룰 때 |
| `ExcelXmlStyleDataBorder` | interface | [xml-data-types.md](./types/xml-data-types.md) | border style XML 구조를 타입으로 다룰 때 |
| `ExcelXml` | interface | [xml-data-types.md](./types/xml-data-types.md) | xlsx XML model 구현 계약을 타입으로 다룰 때 |
