# @simplysm/excel

Excel 파일(.xlsx) 처리 라이브러리. 지연 로딩 아키텍처로 대용량 파일도 메모리 효율적으로 처리한다.

## 설치

```bash
npm install @simplysm/excel
```

**의존성:** `@simplysm/core-common`, `mime`, `zod`

## 아키텍처

ZIP 내부의 XML을 지연 로딩(Lazy Loading)하여 필요한 시점에만 파싱한다. 대용량 SharedStrings나 Styles XML이 있어도 해당 셀에 접근할 때만 로드되므로 메모리 효율적이다.

```
ExcelWorkbook (워크북)
├── ExcelWorksheet (워크시트)
│   ├── ExcelRow (행) → ExcelCell (셀)
│   └── ExcelCol (열) → ExcelCell (셀)
├── ZipCache (ZIP 파일 캐시, 지연 로딩)
└── ExcelWrapper (Zod 스키마 기반 래퍼)
```

**모든 행/열/셀 인덱스는 0-based이다.**

## 리소스 관리

ExcelWorkbook은 내부적으로 ZIP 리소스를 관리하므로, 사용 후 반드시 리소스를 해제해야 한다.

```typescript
// 방법 1: await using (권장)
await using wb = new ExcelWorkbook(bytes);
const ws = await wb.getWorksheet(0);
// ... 작업 수행
// 스코프 종료 시 자동 해제

// 방법 2: try-finally
const wb = new ExcelWorkbook(bytes);
try {
  const ws = await wb.getWorksheet(0);
  // ... 작업 수행
} finally {
  await wb.close();
}
```

## 워크북 (ExcelWorkbook)

### 생성/열기

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// 새 워크북 생성
await using wb = new ExcelWorkbook();

// 기존 파일 열기 (Uint8Array 또는 Blob)
await using wb = new ExcelWorkbook(fileBytes);
await using wb = new ExcelWorkbook(blob);
```

### 워크시트 관리

```typescript
// 워크시트 이름 목록
const names = await wb.getWorksheetNames(); // string[]

// 워크시트 조회 (인덱스: 0-based)
const ws = await wb.getWorksheet(0);
const ws = await wb.getWorksheet("Sheet1");

// 워크시트 추가
const ws = await wb.addWorksheet("새시트");

// 워크시트 이름 변경
await ws.setName("새이름");
const name = await ws.getName();
```

### 파일 내보내기

```typescript
const bytes = await wb.toBytes(); // Uint8Array (Bytes)
const blob = await wb.toBlob();   // Blob (MIME: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
```

## 워크시트 (ExcelWorksheet)

### 셀/행/열 접근

모든 인덱스는 0-based이다.

```typescript
// 셀 접근
const cell = ws.cell(0, 0); // A1 (r=0, c=0)

// 행 접근
const row = ws.row(0);            // 첫 번째 행
const cells = await row.getCells(); // 행의 모든 셀

// 열 접근
const col = ws.col(0);            // 첫 번째 열
const cells = await col.getCells(); // 열의 모든 셀

// 열에서 특정 행의 셀
const cell = ws.col(2).cell(5);   // C6
// 행에서 특정 열의 셀
const cell = ws.row(5).cell(2);   // C6
```

### 데이터 범위

```typescript
const range = await ws.getRange();
// { s: { r: 0, c: 0 }, e: { r: 9, c: 4 } }

// 모든 셀을 2차원 배열로
const cells = await ws.getCells(); // ExcelCell[][]
```

### 행 복사

```typescript
// 행 복사 (덮어쓰기)
await ws.copyRow(0, 5); // 0번 행을 5번 행으로 복사

// 삽입 복사 (기존 행은 아래로 밀림)
await ws.insertCopyRow(0, 5); // 0번 행을 5번 위치에 삽입 복사

// 행 스타일만 복사
await ws.copyRowStyle(0, 5);
```

### 셀 복사

```typescript
// 셀 복사 (값 + 스타일)
await ws.copyCell({ r: 0, c: 0 }, { r: 1, c: 1 });

// 셀 스타일만 복사
await ws.copyCellStyle({ r: 0, c: 0 }, { r: 1, c: 1 });
```

### 뷰 설정

```typescript
// 줌 설정 (퍼센트)
await ws.setZoom(150);

// 틀고정 (r, c 모두 선택적)
await ws.freezeAt({ r: 1 });         // 1번 행 이후 고정 (첫 행 고정)
await ws.freezeAt({ c: 2 });         // 2번 열 이후 고정
await ws.freezeAt({ r: 1, c: 1 });   // 행+열 모두 고정
```

### 데이터 테이블

```typescript
// 시트를 레코드 배열로 읽기
const data = await ws.getDataTable();
// Record<string, ExcelValueType>[]

// 옵션 지정
const data = await ws.getDataTable({
  headerRowIndex: 0,                          // 헤더 행 인덱스 (기본: 범위의 첫 행)
  checkEndColIndex: 0,                        // 이 열이 비어있으면 데이터 종료
  usableHeaderNameFn: (name) => name !== "",  // 사용할 헤더 필터
});

// 2차원 배열 쓰기
await ws.setDataMatrix([
  ["이름", "나이", "이메일"],
  ["Alice", 30, "alice@example.com"],
  ["Bob", 25, "bob@example.com"],
]);

// 레코드 배열 쓰기 (헤더 자동 생성)
await ws.setRecords([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]);
```

### 이미지 삽입

```typescript
await ws.addImage({
  bytes: imageBytes,    // Uint8Array (이미지 바이너리)
  ext: "png",           // 확장자 (png, jpg 등)
  from: {               // 시작 위치 (0-based)
    r: 0, c: 0,
    rOff: 0,            // 행 오프셋 (EMU 단위, 선택적)
    cOff: 0,            // 열 오프셋 (EMU 단위, 선택적)
  },
  to: {                 // 종료 위치 (생략 시 from + 1행 1열)
    r: 5, c: 3,
    rOff: 0,
    cOff: 0,
  },
});
```

## 셀 (ExcelCell)

### 값 읽기/쓰기

```typescript
// 값 설정
await ws.cell(0, 0).setValue("텍스트");
await ws.cell(0, 1).setValue(1234);
await ws.cell(0, 2).setValue(true);
await ws.cell(0, 3).setValue(new DateOnly(2024, 1, 15));
await ws.cell(0, 4).setValue(new DateTime(2024, 1, 15, 10, 30));
await ws.cell(0, 5).setValue(new Time(10, 30, 0));
await ws.cell(0, 6).setValue(undefined); // 셀 삭제

// 값 읽기
const val = await ws.cell(0, 0).getValue();
// ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined
```

### 수식

```typescript
await ws.cell(1, 0).setFormula("SUM(B1:B10)");
await ws.cell(1, 0).setFormula(undefined); // 수식 제거

const formula = await ws.cell(1, 0).getFormula(); // string | undefined
```

### 셀 병합

```typescript
// cell(startR, startC).merge(endR, endC)
// 종료 좌표는 0-based 절대 좌표
await ws.cell(0, 0).merge(2, 2); // A1:C3 범위 병합 (3행 x 3열)
await ws.cell(0, 0).merge(0, 3); // A1:D1 범위 병합 (1행 x 4열)
```

### 스타일

```typescript
await ws.cell(0, 0).setStyle({
  background: "00FF0000",                       // 배경색 (ARGB 8자리 hex, alpha 반전)
  border: ["left", "right", "top", "bottom"],   // 테두리 위치
  horizontalAlign: "center",                    // 수평 정렬: "left" | "center" | "right"
  verticalAlign: "center",                      // 수직 정렬: "top" | "center" | "bottom"
  numberFormat: "number",                       // 숫자 서식: "number" | "string" | "DateOnly" | "DateTime" | "Time"
});

// 스타일 ID 직접 접근
const styleId = await ws.cell(0, 0).getStyleId();
await ws.cell(0, 0).setStyleId(styleId);
```

**ExcelStyleOptions:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `background` | `string` | ARGB 8자리 hex (예: `"00FF0000"` = 빨강) |
| `border` | `ExcelBorderPosition[]` | `"left"`, `"right"`, `"top"`, `"bottom"` |
| `horizontalAlign` | `ExcelHorizontalAlign` | `"left"`, `"center"`, `"right"` |
| `verticalAlign` | `ExcelVerticalAlign` | `"top"`, `"center"`, `"bottom"` |
| `numberFormat` | `ExcelNumberFormat` | `"number"`, `"string"`, `"DateOnly"`, `"DateTime"`, `"Time"` |

## 열 너비

```typescript
await ws.col(0).setWidth(20); // A열 너비 설정
```

## ExcelWrapper (Zod 스키마 기반)

Zod 스키마를 기반으로 타입 안전한 Excel 읽기/쓰기를 제공한다.

### 스키마 정의

```typescript
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("이름"),           // .describe()로 Excel 헤더 이름 지정
  age: z.number().describe("나이"),
  email: z.string().optional().describe("이메일"), // optional: 필수 아닌 필드
  active: z.boolean().describe("활성"),          // boolean: 기본값 false
});

const wrapper = new ExcelWrapper(schema);
```

- `.describe("헤더이름")`: Excel 헤더에 표시될 이름 지정 (미지정 시 필드 키 사용)
- `z.optional()` / `z.nullable()` / `z.default()`: 선택 필드 (헤더 강조 없음)
- 필수 필드(boolean 제외)는 `write()` 시 헤더가 노란색으로 강조됨

### 읽기

```typescript
const records = await wrapper.read(fileBytes, "Sheet1");
// z.infer<typeof schema>[] 타입으로 반환

// 인덱스로 시트 지정 (기본: 0)
const records = await wrapper.read(fileBytes, 0);

// 특정 필드 제외
const records = await wrapper.read(fileBytes, "Sheet1", {
  excludes: ["email"],
});
```

**값 변환 규칙:**
- `ZodString`: 문자열로 변환
- `ZodNumber`: `parseFloat`로 변환
- `ZodBoolean`: `"1"`, `"true"` = true / `"0"`, `"false"` = false
- `DateOnly`, `DateTime`, `Time`: 그대로 전달
- 빈 값: `ZodDefault` → 기본값, `ZodOptional`/`ZodNullable` → `undefined`, `ZodBoolean` → `false`

### 쓰기

```typescript
// ExcelWorkbook을 반환하므로 리소스 관리 필요
await using wb = await wrapper.write("Sheet1", [
  { name: "Alice", age: 30, email: "alice@example.com", active: true },
  { name: "Bob", age: 25, active: false },
]);
const bytes = await wb.toBytes();

// 특정 필드 제외
await using wb = await wrapper.write("Sheet1", records, {
  excludes: ["email"],
});
```

`write()` 자동 적용 사항:
- 모든 셀에 테두리(상하좌우) 적용
- 필수 필드(boolean 제외) 헤더에 노란색 배경
- 줌 85%, 첫 행 틀고정

## 유틸리티 (ExcelUtils)

```typescript
import { ExcelUtils } from "@simplysm/excel";

// 주소 변환 (0-based 좌표 <-> "A1" 형식)
ExcelUtils.stringifyAddr({ r: 0, c: 0 });     // "A1"
ExcelUtils.stringifyAddr({ r: 2, c: 1 });     // "B3"
ExcelUtils.stringifyColAddr(0);                // "A"
ExcelUtils.stringifyColAddr(26);               // "AA"
ExcelUtils.stringifyRowAddr(0);                // "1"

ExcelUtils.parseCellAddr("B3");                // { r: 2, c: 1 }
ExcelUtils.parseColAddr("B3");                 // 1
ExcelUtils.parseRowAddr("B3");                 // 2

// 범위 주소 변환
ExcelUtils.parseRangeAddr("A1:C5");            // { s: {r:0,c:0}, e: {r:4,c:2} }
ExcelUtils.stringifyRangeAddr({ s: {r:0,c:0}, e: {r:4,c:2} }); // "A1:C5"

// 날짜 변환 (JavaScript tick <-> Excel 날짜 숫자)
ExcelUtils.convertTimeTickToNumber(Date.now()); // Excel 날짜 숫자
ExcelUtils.convertNumberToTimeTick(45678);      // JavaScript timestamp (ms)

// 숫자 서식 변환
ExcelUtils.convertNumFmtNameToId("DateOnly");   // 14
ExcelUtils.convertNumFmtIdToName(14);           // "DateOnly"
ExcelUtils.convertNumFmtCodeToName("yyyy-mm-dd"); // "DateOnly"
```

## 타입

```typescript
// 셀 값 타입
type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;

// 숫자 서식
type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";

// 좌표
interface ExcelAddressPoint { r: number; c: number; }
interface ExcelAddressRangePoint { s: ExcelAddressPoint; e: ExcelAddressPoint; }

// 스타일
type ExcelBorderPosition = "left" | "right" | "top" | "bottom";
type ExcelHorizontalAlign = "center" | "left" | "right";
type ExcelVerticalAlign = "center" | "top" | "bottom";
interface ExcelStyleOptions {
  background?: string;
  border?: ExcelBorderPosition[];
  horizontalAlign?: ExcelHorizontalAlign;
  verticalAlign?: ExcelVerticalAlign;
  numberFormat?: ExcelNumberFormat;
}

// 셀 타입
type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";
// s: SharedString, b: boolean, str: 수식 결과 문자열,
// n: 숫자, inlineStr: 인라인 문자열, e: 에러
```
