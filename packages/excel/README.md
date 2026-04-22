# @simplysm/excel

Excel 워크북(xlsx) 읽기/쓰기 라이브러리. DOM 의존성이 없어 Node.js와 브라우저 양쪽에서 동작하는 neutral 패키지다. Lazy Loading 아키텍처로 대용량 파일도 메모리 효율적으로 처리한다.

## Installation

```bash
npm install @simplysm/excel
```

## API Overview

### Core Classes

| Entry | Kind | Description |
|-------|------|-------------|
| [`ExcelWorkbook`](./docs/core-classes/excel-workbook.md) | class | Excel 워크북 진입점. 워크시트 생성/조회, 바이트 내보내기, ZIP 리소스 관리 |
| [`ExcelWorksheet`](./docs/core-classes/excel-worksheet.md) | class | 워크시트. 셀/행/열 접근, 행/셀 복사, 데이터 테이블 읽기, 이미지 삽입, 시트명 변경 |
| [`ExcelCell`](./docs/core-classes/excel-cell.md) | class | 개별 셀. 값/수식 읽기/쓰기, 스타일 설정, 셀 병합 |
| [`ExcelRow`](./docs/core-classes/excel-row.md) | class | 워크시트 행. 셀 접근, 행 전체 셀 조회 |
| [`ExcelCol`](./docs/core-classes/excel-col.md) | class | 워크시트 열. 셀 접근, 열 너비 설정 |

### Wrapper

| Entry | Kind | Description |
|-------|------|-------------|
| [`ExcelWrapper`](./docs/wrapper/excel-wrapper.md) | class | Zod 스키마 기반 타입 안전한 Excel 읽기/쓰기. 헤더 자동 생성, 유효성 검사, 필수 필드 강조 |

### Utilities

| Entry | Kind | Description |
|-------|------|-------------|
| [`ExcelUtils`](./docs/utilities/excel-utils.md) | class | 셀 주소 변환 (좌표↔문자열), 날짜↔숫자 변환, 숫자 형식 매핑 (정적 메서드) |

### Types

| Entry | Kind | Description |
|-------|------|-------------|
| [`ExcelValueType`](./docs/types/excel-value-type.md) | type | 셀 값 타입: number, string, DateOnly, DateTime, Time, boolean, undefined. `ExcelCellType` 포함 |
| [`ExcelAddressPoint`](./docs/types/excel-address-point.md) | interface | 셀 좌표 (0 기반 r, c). `ExcelAddressRangePoint` 포함 |
| [`ExcelStyleOptions`](./docs/types/excel-style-options.md) | interface | 셀 스타일 옵션 (배경색, 테두리, 정렬, 숫자 형식). `ExcelNumberFormat`, `ExcelBorderPosition`, `ExcelHorizontalAlign`, `ExcelVerticalAlign` 포함 |
| [`ExcelXml`](./docs/types/excel-xml.md) | interface | XML 처리 클래스가 구현하는 인터페이스 (내부용) |
| [`ExcelXmlContentTypeData`](./docs/types/excel-xml-content-type-data.md) | interface | `[Content_Types].xml` 데이터 구조 (내부용) |
| [`ExcelXmlRelationshipData`](./docs/types/excel-xml-relationship-data.md) | interface | `*.rels` 파일 데이터 구조 (내부용). `ExcelRelationshipData` 포함 |
| [`ExcelXmlWorkbookData`](./docs/types/excel-xml-workbook-data.md) | interface | `workbook.xml` 데이터 구조 (내부용) |
| [`ExcelXmlWorksheetData`](./docs/types/excel-xml-worksheet-data.md) | interface | `worksheet*.xml` 데이터 구조 (내부용). `ExcelRowData`, `ExcelCellData` 포함 |
| [`ExcelXmlDrawingData`](./docs/types/excel-xml-drawing-data.md) | interface | `drawing*.xml` 데이터 구조 (내부용) |
| [`ExcelXmlSharedStringData`](./docs/types/excel-xml-shared-string-data.md) | interface | `sharedStrings.xml` 데이터 구조 (내부용). `ExcelXmlSharedStringDataSi`, `ExcelXmlSharedStringDataText` 포함 |
| [`ExcelXmlStyleData`](./docs/types/excel-xml-style-data.md) | interface | `styles.xml` 데이터 구조 (내부용). `ExcelXmlStyleDataXf`, `ExcelXmlStyleDataFill`, `ExcelXmlStyleDataBorder` 포함 |

## Usage Examples

### 새 Excel 파일 생성 및 저장

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

const wb = new ExcelWorkbook();
try {
  const ws = await wb.addWorksheet("Sheet1");
  
  // 헤더 행
  await ws.cell(0, 0).setValue("이름");
  await ws.cell(0, 1).setValue("나이");
  
  // 데이터 행
  await ws.cell(1, 0).setValue("김철수");
  await ws.cell(1, 1).setValue(30);
  
  const bytes = await wb.toBytes();
  // 파일 저장 또는 전송
} finally {
  await wb.close();
}
```

### 기존 Excel 파일 읽기

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

const bytes = /* 파일 바이트 배열 */;
const wb = new ExcelWorkbook(bytes);
try {
  // 시트명 또는 인덱스(0 기반)로 조회
  const ws = await wb.getWorksheet(0);
  
  // 개별 셀 읽기
  const value = await ws.cell(0, 0).getValue();
  
  // 전체 데이터 테이블 읽기 (첫 행이 헤더)
  const table = await ws.getDataTable();
} finally {
  await wb.close();
}
```

### Zod 스키마 기반 타입 안전한 작업

```typescript
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("이름"),
  age: z.number().describe("나이"),
  email: z.string().optional().describe("이메일"),
});

const wrapper = new ExcelWrapper(schema);

// 레코드 배열을 Excel로 쓰기
const records = [
  { name: "김철수", age: 30, email: "kim@example.com" },
  { name: "이영희", age: 28 },
];
const wb = await wrapper.write("사람", records);
try {
  const bytes = await wb.toBytes();
} finally {
  await wb.close();
}

// Excel 파일을 레코드 배열로 읽기 (유효성 검사 포함)
const bytes = /* 파일 바이트 배열 */;
const data = await wrapper.read(bytes, "사람");
```
