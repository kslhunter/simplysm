# @simplysm/excel

Excel 파일(.xlsx) 처리 라이브러리입니다. Node.js와 브라우저 환경 모두에서 사용할 수 있습니다.

## 설치

```bash
npm install @simplysm/excel
# or
yarn add @simplysm/excel
```

## 주요 기능

### ExcelWorkbook

Excel 워크북을 생성하고 관리합니다.

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// 새 워크북 생성
const workbook = ExcelWorkbook.create();
const sheet = workbook.createWorksheet("Sheet1");

// 셀 값 설정
sheet.cell(0, 0).value = "Hello";
sheet.cell(0, 1).value = "World";

// 파일로 저장 (ArrayBuffer 반환)
const buffer = await workbook.getBufferAsync();
```

### 파일 읽기

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// ArrayBuffer로부터 읽기
const workbook = await ExcelWorkbook.loadAsync(arrayBuffer);

// 워크시트 접근
const sheet = workbook.worksheets[0];
const value = sheet.cell(0, 0).value;
```

### ExcelWrapper

간편한 데이터 변환을 위한 래퍼 클래스입니다.

```typescript
import { ExcelWrapper, parseExcelWrapper } from "@simplysm/excel";

// Excel 데이터 읽기 - Zod 스키마 지원
const data = await parseExcelWrapper(buffer, sheetName, schema);

// 데이터를 Excel로 변환
const wrapper = new ExcelWrapper([
  { name: "John", age: 30 },
  { name: "Jane", age: 25 },
]);
const buffer = await wrapper.toBufferAsync();
```

## 클래스 구조

| 클래스 | 설명 |
|-------|------|
| `ExcelWorkbook` | 워크북 관리 |
| `ExcelWorksheet` | 워크시트 관리 |
| `ExcelRow` | 행 관리 |
| `ExcelCol` | 열 관리 |
| `ExcelCell` | 셀 관리 (값, 스타일, 수식 등) |
| `ExcelWrapper` | 데이터 변환 래퍼 |

## 지원 기능

- 셀 값 읽기/쓰기
- 셀 스타일 (폰트, 배경색, 테두리 등)
- 셀 병합
- 수식
- 이미지 삽입
- 여러 워크시트 관리

## 라이선스

Apache-2.0
