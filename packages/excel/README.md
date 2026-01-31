# @simplysm/excel

Excel 파일(.xlsx) 처리 라이브러리이다. Node.js와 브라우저 환경 모두에서 사용할 수 있다.

## 설치

```bash
npm install @simplysm/excel
# or
yarn add @simplysm/excel
# or
pnpm add @simplysm/excel
```

## 주요 기능

### ExcelWorkbook

Excel 워크북을 생성하고 관리한다.

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// 새 워크북 생성
const workbook = new ExcelWorkbook();
const sheet = await workbook.createWorksheet("Sheet1");

// 셀 값 설정
await sheet.cell(0, 0).setVal("Hello");
await sheet.cell(0, 1).setVal("World");

// Bytes로 출력 (Uint8Array)
const bytes = await workbook.getBytes();

// Blob으로 출력
const blob = await workbook.getBlob();

// 리소스 해제
await workbook.close();
```

### 파일 읽기

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// Uint8Array 또는 Blob으로부터 읽기
const workbook = new ExcelWorkbook(bytes);

// 워크시트 접근 (인덱스 또는 이름)
const sheetByIndex = await workbook.getWorksheet(0);
// 또는
const sheetByName = await workbook.getWorksheet("Sheet1");

// 셀 값 읽기
const value = await sheet.cell(0, 0).getVal();

// await using 문법 지원 (자동 리소스 해제)
await using wb = new ExcelWorkbook(bytes);
const ws = await wb.getWorksheet(0);
```

### ExcelWrapper

Zod 스키마 기반의 타입 안전한 Excel 데이터 변환 래퍼이다.

```typescript
import { z } from "zod";
import { ExcelWrapper } from "@simplysm/excel";

// 스키마 정의
const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().optional(),
});

// 표시 이름 매핑
const displayNameMap = {
  name: "이름",
  age: "나이",
  email: "이메일",
};

const wrapper = new ExcelWrapper(schema, displayNameMap);

// 레코드를 Excel로 변환
const records = [
  { name: "홍길동", age: 30, email: "hong@test.com" },
  { name: "김철수", age: 25 },
];
// write()는 ExcelWorkbook을 반환하므로 반드시 리소스를 해제해야 한다
await using workbook = await wrapper.write("Users", records);
const bytes = await workbook.getBytes();

// Excel에서 레코드 읽기 (데이터가 없으면 에러 발생)
const readRecords = await wrapper.read(bytes, "Users");
// readRecords: { name: string; age: number; email?: string }[]
```

### 셀 스타일

```typescript
// 배경색 설정 (ARGB 형식: AARRGGBB, AA는 alpha 값, 00=완전 투명, FF=완전 불투명)
await cell.setStyle({ background: "FFFF0000" }); // 빨간색 (완전 불투명)

// 테두리 설정
await cell.setStyle({ border: ["left", "right", "top", "bottom"] });

// 정렬 설정
await cell.setStyle({
  horizontalAlign: "center",
  verticalAlign: "center",
});

// 숫자 형식 설정
await cell.setStyle({ numberFormat: "number" }); // number, DateOnly, DateTime, Time, string
```

### 이미지 삽입

```typescript
await sheet.addImage({
  bytes: imageBytes,
  ext: "png",
  from: { r: 0, c: 0 },
  to: { r: 5, c: 3 },
});
```

### 셀 병합

```typescript
await sheet.cell(0, 0).setVal("Merged Cell");
// A1 셀부터 D3 셀까지 병합 (3행 x 4열)
await sheet.cell(0, 0).merge(2, 3);
```

### 수식

```typescript
await sheet.cell(0, 0).setVal(10);
await sheet.cell(0, 1).setVal(20);
await sheet.cell(0, 2).setFormula("A1+B1");
```

## 아키텍처

### 비동기 API 설계

이 라이브러리의 모든 셀 관련 메서드는 `async`로 설계되어 있다. 이는 의도된 설계이며, 다음과 같은 이유로 필수적이다:

#### Lazy Loading 구조

대용량 Excel 파일에서 메모리 효율성을 위해 필요한 부분만 로드한다:

- **문자열 셀 읽기**: SharedStrings.xml 로드
- **숫자 셀 읽기**: SharedStrings 로드 안함
- **스타일이 있는 셀**: Styles.xml 로드

#### 극단적 케이스 대응

SharedStrings가 1TB인 파일에서 숫자 셀 하나만 읽는 경우:
- 비동기 구조: 숫자 셀만 읽으면 SharedStrings를 로드하지 않음
- 동기 구조: 모든 XML을 미리 로드해야 하므로 메모리 부족 발생

#### 사용 시 고려사항

모든 셀 메서드가 `async`이므로 `await`를 사용해야 한다:

```typescript
// 올바른 사용
const value = await cell.getVal();
await cell.setVal("Hello");

// 잘못된 사용
const value = cell.getVal(); // Promise 객체를 반환
cell.setVal("Hello"); // 즉시 실행되지 않음
```

## 클래스 구조

| 클래스 | 설명 |
|-------|------|
| `ExcelWorkbook` | 워크북 관리 |
| `ExcelWorksheet` | 워크시트 관리 |
| `ExcelRow` | 행 관리 |
| `ExcelCol` | 열 관리 |
| `ExcelCell` | 셀 관리 (값, 스타일, 수식 등) |
| `ExcelWrapper` | Zod 스키마 기반 데이터 변환 래퍼 |
| `ExcelUtils` | 셀 주소 변환 등 유틸리티 |

## 지원 기능

- 셀 값 읽기/쓰기 (string, number, boolean, DateOnly, DateTime, Time)
- 셀 스타일 (배경색, 테두리, 정렬, 숫자 형식)
- 셀 병합
- 수식
- 이미지 삽입
- 여러 워크시트 관리
- `await using` 문법 지원 (자동 리소스 해제)

## 라이선스

Apache-2.0
