# @simplysm/excel

심플리즘 패키지 - xlsx 파일 읽기/쓰기 라이브러리. DOM-independent (neutral) 환경에서 동작한다.

## Installation

```bash
npm install @simplysm/excel
```

## API Overview

### Core Classes

| API | Type | Description |
|-----|------|-------------|
| `ExcelWorkbook` | class | Excel 워크북 처리 클래스. ZIP 리소스를 관리하며, 워크시트 생성/조회/내보내기를 제공한다 |
| `ExcelWorksheet` | class | Excel 워크시트. 셀/행/열 접근, 복사, 데이터 테이블, 이미지 삽입 기능을 제공한다 |
| `ExcelCell` | class | Excel 셀. 값 읽기/쓰기, 수식, 스타일, 셀 병합 기능을 제공한다 |
| `ExcelRow` | class | Excel 행. 셀 접근 기능을 제공한다 |
| `ExcelCol` | class | Excel 열. 셀 접근 및 열 너비 설정 기능을 제공한다 |

-> See [docs/core-classes.md](./docs/core-classes.md) for details.

### Wrapper

| API | Type | Description |
|-----|------|-------------|
| `ExcelWrapper` | class | Zod 스키마 기반 타입 안전한 Excel 읽기/쓰기 래퍼 |

-> See [docs/wrapper.md](./docs/wrapper.md) for details.

### Utilities

| API | Type | Description |
|-----|------|-------------|
| `ExcelUtils` | class | 셀 주소 변환, 날짜/숫자 변환, 숫자 형식 처리 정적 메서드 모음 |

-> See [docs/utilities.md](./docs/utilities.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `ExcelValueType` | type | 셀 값 타입 (`number \| string \| DateOnly \| DateTime \| Time \| boolean \| undefined`) |
| `ExcelNumberFormat` | type | 숫자 형식 이름 (`"number" \| "string" \| "DateOnly" \| "DateTime" \| "Time"`) |
| `ExcelCellType` | type | Excel 셀 타입 (`"s" \| "b" \| "str" \| "n" \| "inlineStr" \| "e"`) |
| `ExcelAddressPoint` | interface | 셀 좌표 (0 기반 r, c) |
| `ExcelAddressRangePoint` | interface | 셀 범위 좌표 (s, e) |
| `ExcelStyleOptions` | interface | 셀 스타일 옵션 (배경색, 테두리, 정렬, 숫자 형식) |
| `ExcelBorderPosition` | type | 테두리 위치 (`"left" \| "right" \| "top" \| "bottom"`) |
| `ExcelHorizontalAlign` | type | 가로 정렬 (`"center" \| "left" \| "right"`) |
| `ExcelVerticalAlign` | type | 세로 정렬 (`"center" \| "top" \| "bottom"`) |
| `ExcelXml` | interface | XML 처리 클래스가 구현하는 인터페이스 (내부용) |
| `ExcelXmlContentTypeData` | interface | `[Content_Types].xml` 데이터 구조 (내부용) |
| `ExcelXmlRelationshipData` | interface | `*.rels` 데이터 구조 (내부용) |
| `ExcelRelationshipData` | interface | 개별 Relationship 엔트리 데이터 (내부용) |
| `ExcelXmlWorkbookData` | interface | `workbook.xml` 데이터 구조 (내부용) |
| `ExcelXmlWorksheetData` | interface | `worksheet*.xml` 데이터 구조 (내부용) |
| `ExcelRowData` | interface | 행 XML 데이터 (내부용) |
| `ExcelCellData` | interface | 셀 XML 데이터 (내부용) |
| `ExcelXmlDrawingData` | interface | `drawing*.xml` 데이터 구조 (내부용) |
| `ExcelXmlSharedStringData` | interface | `sharedStrings.xml` 데이터 구조 (내부용) |
| `ExcelXmlSharedStringDataSi` | type | SharedString 개별 항목 union 타입 (내부용) |
| `ExcelXmlSharedStringDataText` | type | SharedString 텍스트 데이터 (내부용) |
| `ExcelXmlStyleData` | interface | `styles.xml` 데이터 구조 (내부용) |
| `ExcelXmlStyleDataXf` | interface | 셀 서식(xf) 데이터 (내부용) |
| `ExcelXmlStyleDataFill` | interface | 채우기 스타일 데이터 (내부용) |
| `ExcelXmlStyleDataBorder` | interface | 테두리 스타일 데이터 (내부용) |

-> See [docs/types.md](./docs/types.md) for details.

## Usage Examples

### 워크북 생성 및 셀 값 쓰기

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

await using wb = new ExcelWorkbook();
const ws = await wb.addWorksheet("Sheet1");
await ws.cell(0, 0).setValue("이름");
await ws.cell(0, 1).setValue("나이");
await ws.cell(1, 0).setValue("홍길동");
await ws.cell(1, 1).setValue(30);
const bytes = await wb.toBytes();
```

### 기존 파일 읽기

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

await using wb = new ExcelWorkbook(fileBytes);
const ws = await wb.getWorksheet(0);
const value = await ws.cell(0, 0).getValue();
const dataTable = await ws.getDataTable();
```

### Zod 스키마 기반 래퍼 사용

```typescript
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("이름"),
  age: z.number().describe("나이"),
  email: z.string().optional().describe("이메일"),
});

const wrapper = new ExcelWrapper(schema);

// 쓰기
await using wb = await wrapper.write("Sheet1", records);
const bytes = await wb.toBytes();

// 읽기
const records = await wrapper.read(fileBytes, "Sheet1");
```
