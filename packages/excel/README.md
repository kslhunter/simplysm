# @simplysm/excel

Excel 워크북(xlsx) 읽기/쓰기 라이브러리. DOM 의존성이 없어 Node.js와 브라우저 양쪽에서 동작하는 neutral 패키지다. Lazy Loading 아키텍처로 대용량 파일도 메모리 효율적으로 처리한다.

## Installation

```bash
npm install @simplysm/excel
```

## API Overview

### Core Classes

| API | Type | Description |
|-----|------|-------------|
| `ExcelWorkbook` | class | Excel 워크북 진입점. 워크시트 생성/조회, 바이트 내보내기, ZIP 리소스 관리 |
| `ExcelWorksheet` | class | 워크시트. 셀/행/열 접근, 행/셀 복사, 데이터 테이블 읽기, 이미지 삽입, 시트명 변경 |
| `ExcelCell` | class | 개별 셀. 값/수식 읽기/쓰기, 스타일 설정, 셀 병합 |
| `ExcelRow` | class | 워크시트 행. 셀 접근, 행 전체 셀 조회 |
| `ExcelCol` | class | 워크시트 열. 셀 접근, 열 너비 설정 |

→ See [docs/core-classes.md](./docs/core-classes.md) for details.

### Wrapper

| API | Type | Description |
|-----|------|-------------|
| `ExcelWrapper` | class | Zod 스키마 기반 타입 안전한 Excel 읽기/쓰기. 헤더 자동 생성, 유효성 검사, 필수 필드 강조 |

→ See [docs/wrapper.md](./docs/wrapper.md) for details.

### Utilities

| API | Type | Description |
|-----|------|-------------|
| `ExcelUtils` | class | 셀 주소 변환 (좌표↔문자열), 날짜↔숫자 변환, 숫자 형식 매핑 (정적 메서드) |

→ See [docs/utilities.md](./docs/utilities.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `ExcelValueType` | type | 셀 값 타입: number, string, DateOnly, DateTime, Time, boolean, undefined |
| `ExcelNumberFormat` | type | 숫자 형식 이름: "number", "string", "DateOnly", "DateTime", "Time" |
| `ExcelCellType` | type | 셀 타입: "s"(공유문자열), "b"(boolean), "str"(수식문자열), "n"(숫자), "inlineStr", "e"(에러) |
| `ExcelAddressPoint` | interface | 셀 좌표 (0 기반 r, c) |
| `ExcelAddressRangePoint` | interface | 셀 범위 좌표 (시작점 s, 끝점 e) |
| `ExcelStyleOptions` | interface | 셀 스타일 옵션 (배경색, 테두리, 정렬, 숫자 형식) |
| `ExcelBorderPosition` | type | 테두리 위치: "left", "right", "top", "bottom" |
| `ExcelHorizontalAlign` | type | 가로 정렬: "left", "center", "right" |
| `ExcelVerticalAlign` | type | 세로 정렬: "top", "center", "bottom" |
| `ExcelXml` | interface | XML 처리 클래스가 구현하는 인터페이스 (내부용) |
| `ExcelXmlContentTypeData` | interface | `[Content_Types].xml` 데이터 구조 (내부용) |
| `ExcelXmlRelationshipData` | interface | `*.rels` 파일 데이터 구조 (내부용) |
| `ExcelRelationshipData` | interface | 개별 Relationship 엔트리 데이터 (내부용) |
| `ExcelXmlWorkbookData` | interface | `workbook.xml` 데이터 구조 (내부용) |
| `ExcelXmlWorksheetData` | interface | `worksheet*.xml` 데이터 구조 (내부용) |
| `ExcelRowData` | interface | 행 XML 데이터 (내부용) |
| `ExcelCellData` | interface | 셀 XML 데이터 (내부용) |
| `ExcelXmlDrawingData` | interface | `drawing*.xml` 데이터 구조 (내부용) |
| `ExcelXmlSharedStringData` | interface | `sharedStrings.xml` 데이터 구조 (내부용) |
| `ExcelXmlSharedStringDataSi` | type | SharedString 개별 항목 (단순 텍스트 or rich text) |
| `ExcelXmlSharedStringDataText` | type | SharedString 텍스트 데이터 (내부용) |
| `ExcelXmlStyleData` | interface | `styles.xml` 데이터 구조 (내부용) |
| `ExcelXmlStyleDataXf` | interface | 셀 서식(xf) 데이터 (내부용) |
| `ExcelXmlStyleDataFill` | interface | 채우기 스타일 데이터 (내부용) |
| `ExcelXmlStyleDataBorder` | interface | 테두리 스타일 데이터 (내부용) |

→ See [docs/types.md](./docs/types.md) for details.

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
