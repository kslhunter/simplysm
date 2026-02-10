# @simplysm/excel

Excel 파일(.xlsx)을 읽고 쓰는 TypeScript 라이브러리이다. Node.js와 브라우저 환경 모두에서 사용할 수 있으며, 내부적으로 ZIP 기반의 Lazy Loading 구조를 채택하여 대용량 파일에서도 메모리 효율적으로 동작한다.

## 설치

```bash
npm install @simplysm/excel
# or
yarn add @simplysm/excel
# or
pnpm add @simplysm/excel
```

### 의존성

| 패키지 | 용도 |
|--------|------|
| `@simplysm/core-common` | 날짜/시간 타입 (`DateOnly`, `DateTime`, `Time`), 유틸리티 |
| `zod` | `ExcelWrapper`의 스키마 기반 데이터 검증 |
| `mime` | 이미지 삽입 시 MIME 타입 결정 |

## 주요 모듈

### 핵심 클래스

| 클래스 | 설명 |
|--------|------|
| `ExcelWorkbook` | 워크북 생성, 열기, 내보내기, 리소스 관리 |
| `ExcelWorksheet` | 워크시트 접근, 데이터 읽기/쓰기, 이미지 삽입, 뷰 설정 |
| `ExcelRow` | 행 단위 셀 접근 |
| `ExcelCol` | 열 단위 셀 접근 및 너비 설정 |
| `ExcelCell` | 셀 값, 수식, 스타일, 병합 처리 |

### 래퍼 클래스

| 클래스 | 설명 |
|--------|------|
| `ExcelWrapper` | Zod 스키마 기반의 타입 안전한 Excel 데이터 변환 |

### 유틸리티

| 클래스 | 설명 |
|--------|------|
| `ExcelUtils` | 셀 주소 변환, 날짜/숫자 변환, 숫자 형식 처리 |

### 타입

| 타입 | 설명 |
|------|------|
| `ExcelValueType` | 셀 값 타입 (`number \| string \| DateOnly \| DateTime \| Time \| boolean \| undefined`) |
| `ExcelNumberFormat` | 숫자 형식 (`"number" \| "string" \| "DateOnly" \| "DateTime" \| "Time"`) |
| `ExcelCellType` | 셀 내부 타입 (`"s" \| "b" \| "str" \| "n" \| "inlineStr" \| "e"`) |
| `ExcelStyleOptions` | 셀 스타일 옵션 (배경색, 테두리, 정렬, 숫자 형식) |
| `ExcelBorderPosition` | 테두리 위치 (`"left" \| "right" \| "top" \| "bottom"`) |
| `ExcelHorizontalAlign` | 가로 정렬 (`"center" \| "left" \| "right"`) |
| `ExcelVerticalAlign` | 세로 정렬 (`"center" \| "top" \| "bottom"`) |
| `ExcelAddressPoint` | 셀 좌표 (`{ r: number; c: number }`) |
| `ExcelAddressRangePoint` | 범위 좌표 (`{ s: ExcelAddressPoint; e: ExcelAddressPoint }`) |

## 사용법

### 새 워크북 생성 및 셀 값 쓰기

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

const wb = new ExcelWorkbook();
const ws = await wb.createWorksheet("Sheet1");

// 셀 값 설정 (행, 열 모두 0-based 인덱스)
await ws.cell(0, 0).setVal("이름");
await ws.cell(0, 1).setVal("나이");
await ws.cell(1, 0).setVal("홍길동");
await ws.cell(1, 1).setVal(30);

// Uint8Array로 출력
const bytes = await wb.getBytes();

// 또는 Blob으로 출력 (브라우저에서 다운로드 시 유용)
const blob = await wb.getBlob();

// 리소스 해제 (필수)
await wb.close();
```

### 기존 파일 읽기

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// Uint8Array 또는 Blob에서 워크북 열기
const wb = new ExcelWorkbook(bytes);

// 인덱스로 워크시트 접근 (0-based)
const ws = await wb.getWorksheet(0);

// 또는 이름으로 워크시트 접근
const wsByName = await wb.getWorksheet("Sheet1");

// 셀 값 읽기
const name = await ws.cell(0, 0).getVal();   // string | number | boolean | DateOnly | DateTime | Time | undefined
const age = await ws.cell(0, 1).getVal();

// 워크시트 이름 목록 조회
const sheetNames = await wb.getWorksheetNames();

await wb.close();
```

### 리소스 관리 (await using)

`ExcelWorkbook`은 `Symbol.asyncDispose`를 구현하여 `await using` 문법으로 자동 리소스 해제가 가능하다.

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// 스코프 종료 시 자동으로 close() 호출
await using wb = new ExcelWorkbook(bytes);
const ws = await wb.getWorksheet(0);
const value = await ws.cell(0, 0).getVal();
```

`await using`을 사용하지 않는 경우 반드시 `try-finally`로 리소스를 해제해야 한다.

```typescript
const wb = new ExcelWorkbook(bytes);
try {
  const ws = await wb.getWorksheet(0);
  // ... 작업 수행
} finally {
  await wb.close();
}
```

### 셀 스타일 설정

```typescript
const cell = ws.cell(0, 0);

// 배경색 (ARGB 8자리 16진수: AA=alpha, RR=red, GG=green, BB=blue)
await cell.setStyle({ background: "FFFF0000" });  // 빨간색 (불투명)
await cell.setStyle({ background: "00FFFF00" });  // 노란색

// 테두리
await cell.setStyle({ border: ["left", "right", "top", "bottom"] });

// 정렬
await cell.setStyle({
  horizontalAlign: "center",
  verticalAlign: "center",
});

// 숫자 형식
await cell.setStyle({ numberFormat: "number" });
await cell.setStyle({ numberFormat: "DateOnly" });
await cell.setStyle({ numberFormat: "DateTime" });
await cell.setStyle({ numberFormat: "Time" });
await cell.setStyle({ numberFormat: "string" });

// 여러 스타일 동시 적용
await cell.setStyle({
  background: "FFFF0000",
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
  verticalAlign: "center",
  numberFormat: "number",
});
```

### 수식

```typescript
await ws.cell(0, 0).setVal(10);
await ws.cell(0, 1).setVal(20);
await ws.cell(0, 2).setFormula("A1+B1");  // 결과: 30

// 수식 읽기
const formula = await ws.cell(0, 2).getFormula();  // "A1+B1"

// 수식 삭제
await ws.cell(0, 2).setFormula(undefined);
```

### 셀 병합

```typescript
await ws.cell(0, 0).setVal("병합된 셀");

// 현재 셀(0,0)부터 (2,3)까지 병합 (3행 x 4열 영역, 즉 A1:D3)
await ws.cell(0, 0).merge(2, 3);
```

`merge(r, c)` 메서드의 인자는 병합 끝점의 0-based 행/열 인덱스이다.

### 열 너비 설정

```typescript
// 0번 열(A열)의 너비를 20으로 설정
await ws.col(0).setWidth(20);
```

### 행/셀 복사

```typescript
// 0번 행의 스타일만 2번 행에 복사
await ws.copyRowStyle(0, 2);

// 0번 행 전체를 2번 행에 복사 (값 + 스타일)
await ws.copyRow(0, 2);

// 개별 셀 복사
await ws.copyCell({ r: 0, c: 0 }, { r: 1, c: 1 });

// 소스 행을 타겟 위치에 삽입 복사 (기존 행은 아래로 밀림)
await ws.insertCopyRow(0, 3);
```

### 데이터 테이블 읽기 (getDataTable)

워크시트 데이터를 헤더 기반의 레코드 배열로 변환한다. 첫 번째 행을 헤더로 사용하여 `Record<string, ExcelValueType>[]` 형태로 반환한다.

```typescript
// 기본 사용: 첫 번째 행이 헤더
const data = await ws.getDataTable();
// [{ "이름": "홍길동", "나이": 30 }, { "이름": "김철수", "나이": 25 }]

// 헤더 행 인덱스 지정
const data2 = await ws.getDataTable({ headerRowIndex: 2 });

// 특정 열이 비어있으면 데이터 끝으로 판단
const data3 = await ws.getDataTable({ checkEndColIndex: 0 });

// 사용할 헤더만 필터링
const data4 = await ws.getDataTable({
  usableHeaderNameFn: (name) => ["이름", "나이"].includes(name),
});
```

### 데이터 쓰기 (setDataMatrix / setRecords)

```typescript
// 2차원 배열로 쓰기
await ws.setDataMatrix([
  ["이름", "나이"],
  ["홍길동", 30],
  ["김철수", 25],
]);

// 레코드 배열로 쓰기 (자동 헤더 생성)
await ws.setRecords([
  { "이름": "홍길동", "나이": 30 },
  { "이름": "김철수", "나이": 25 },
]);
```

### 이미지 삽입

```typescript
await ws.addImage({
  bytes: imageBytes,   // Uint8Array
  ext: "png",          // 확장자 (png, jpg 등)
  from: { r: 0, c: 0 },                  // 시작 위치 (0-based)
  to: { r: 5, c: 3 },                    // 끝 위치 (0-based)
});

// EMU(English Metric Units) 단위 오프셋 지정
await ws.addImage({
  bytes: imageBytes,
  ext: "jpg",
  from: { r: 0, c: 0, rOff: 0, cOff: 0 },
  to: { r: 5, c: 3, rOff: 100000, cOff: 100000 },
});

// to를 생략하면 from 위치에 1셀 크기로 삽입
await ws.addImage({
  bytes: imageBytes,
  ext: "png",
  from: { r: 0, c: 0 },
});
```

### 뷰 설정

```typescript
// 확대/축소 비율 설정 (퍼센트)
await ws.setZoom(85);

// 행/열 틀 고정
await ws.setFix({ r: 0 });          // 첫 번째 행 고정
await ws.setFix({ c: 0 });          // 첫 번째 열 고정
await ws.setFix({ r: 0, c: 0 });    // 첫 번째 행 + 열 고정
```

### 워크시트 이름 관리

```typescript
const name = await ws.getName();
await ws.setName("새 시트 이름");
```

### ExcelWrapper (Zod 스키마 기반 래퍼)

`ExcelWrapper`는 Zod 스키마를 기반으로 타입 안전하게 Excel 데이터를 읽고 쓸 수 있는 래퍼 클래스이다.

```typescript
import { z } from "zod";
import { ExcelWrapper } from "@simplysm/excel";

// 1. 스키마 정의
const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().optional(),
  active: z.boolean(),
});

// 2. 필드명-표시명 매핑 (Excel 헤더에 표시되는 이름)
const displayNameMap = {
  name: "이름",
  age: "나이",
  email: "이메일",
  active: "활성 여부",
};

const wrapper = new ExcelWrapper(schema, displayNameMap);
```

#### Excel 쓰기

```typescript
const records = [
  { name: "홍길동", age: 30, email: "hong@test.com", active: true },
  { name: "김철수", age: 25, active: false },
];

// write()는 ExcelWorkbook을 반환하므로 리소스 관리 필수
await using wb = await wrapper.write("Users", records);
const bytes = await wb.getBytes();
```

`write()` 메서드는 다음 서식을 자동으로 적용한다:
- 모든 셀에 테두리 적용
- 필수 필드(optional/nullable/default가 아닌 필드) 헤더에 노란색 배경
- 확대/축소 비율 85%, 첫 번째 행 틀 고정

#### Excel 읽기

```typescript
// 파일에서 레코드 읽기 (Uint8Array 또는 Blob)
const records = await wrapper.read(bytes);
// records: { name: string; age: number; email?: string; active: boolean }[]

// 워크시트 이름 또는 인덱스 지정
const records2 = await wrapper.read(bytes, "Users");
const records3 = await wrapper.read(bytes, 0);
```

`read()` 메서드의 동작:
- 스키마의 `_displayNameMap`에 정의된 헤더만 읽는다
- 값이 모두 비어있는 행은 건너뛴다
- Zod 스키마로 각 행을 검증하며, 실패 시 에러를 발생시킨다
- 데이터가 없으면 에러를 발생시킨다
- 타입 자동 변환: 문자열 -> 숫자, 문자열 -> boolean ("1"/"true" -> true) 등

## ExcelUtils API

| 메서드 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| `stringifyAddr(point)` | `{ r: 0, c: 0 }` | `"A1"` | 좌표를 셀 주소 문자열로 변환 |
| `stringifyRowAddr(r)` | `0` | `"1"` | 행 인덱스를 행 주소로 변환 |
| `stringifyColAddr(c)` | `0` | `"A"` | 열 인덱스를 열 주소로 변환 (0~16383) |
| `parseCellAddrCode(addr)` | `"B3"` | `{ r: 2, c: 1 }` | 셀 주소를 좌표로 변환 |
| `parseRowAddrCode(addr)` | `"A3"` | `2` | 셀 주소에서 행 인덱스 추출 |
| `parseColAddrCode(addr)` | `"B3"` | `1` | 셀 주소에서 열 인덱스 추출 |
| `parseRangeAddrCode(range)` | `"A1:C3"` | `{ s: {r:0,c:0}, e: {r:2,c:2} }` | 범위 주소를 좌표로 변환 |
| `stringifyRangeAddr(point)` | `{ s: {r:0,c:0}, e: {r:2,c:2} }` | `"A1:C3"` | 범위 좌표를 주소 문자열로 변환 |
| `convertTimeTickToNumber(tick)` | JS 타임스탬프(ms) | Excel 날짜 숫자 | JS 날짜를 Excel 숫자로 변환 |
| `convertNumberToTimeTick(num)` | Excel 날짜 숫자 | JS 타임스탬프(ms) | Excel 숫자를 JS 날짜로 변환 |
| `convertNumFmtIdToName(id)` | 형식 ID | `ExcelNumberFormat` | 내장 형식 ID를 이름으로 변환 |
| `convertNumFmtCodeToName(code)` | 형식 코드 | `ExcelNumberFormat` | 형식 코드를 이름으로 변환 |
| `convertNumFmtNameToId(name)` | `ExcelNumberFormat` | 형식 ID | 형식 이름을 ID로 변환 |

## ExcelCell API

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `getVal()` | `Promise<ExcelValueType>` | 셀 값 반환 |
| `setVal(val)` | `Promise<void>` | 셀 값 설정 (undefined 시 셀 삭제) |
| `getFormula()` | `Promise<string \| undefined>` | 수식 반환 |
| `setFormula(val)` | `Promise<void>` | 수식 설정 (undefined 시 수식 삭제) |
| `setStyle(opts)` | `Promise<void>` | 스타일 설정 |
| `merge(r, c)` | `Promise<void>` | 현재 셀부터 (r, c)까지 병합 |
| `getStyleId()` | `Promise<string \| undefined>` | 스타일 ID 반환 |
| `setStyleId(id)` | `Promise<void>` | 스타일 ID 직접 설정 |

## ExcelWorksheet API

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `cell(r, c)` | `ExcelCell` | 셀 객체 반환 (0-based) |
| `row(r)` | `ExcelRow` | 행 객체 반환 (0-based) |
| `col(c)` | `ExcelCol` | 열 객체 반환 (0-based) |
| `getName()` | `Promise<string>` | 워크시트 이름 반환 |
| `setName(name)` | `Promise<void>` | 워크시트 이름 변경 |
| `getRange()` | `Promise<ExcelAddressRangePoint>` | 데이터 범위 반환 |
| `getCells()` | `Promise<ExcelCell[][]>` | 모든 셀을 2차원 배열로 반환 |
| `getDataTable(opt?)` | `Promise<Record<string, ExcelValueType>[]>` | 헤더 기반 레코드 배열로 변환 |
| `setDataMatrix(matrix)` | `Promise<void>` | 2차원 배열 데이터 기록 |
| `setRecords(records)` | `Promise<void>` | 레코드 배열 기록 (자동 헤더 생성) |
| `copyRow(src, target)` | `Promise<void>` | 행 복사 |
| `copyRowStyle(src, target)` | `Promise<void>` | 행 스타일만 복사 |
| `copyCell(src, target)` | `Promise<void>` | 셀 복사 |
| `copyCellStyle(src, target)` | `Promise<void>` | 셀 스타일만 복사 |
| `insertCopyRow(src, target)` | `Promise<void>` | 행 삽입 복사 (기존 행 밀림) |
| `addImage(opts)` | `Promise<void>` | 이미지 삽입 |
| `setZoom(percent)` | `Promise<void>` | 확대/축소 비율 설정 |
| `setFix(point)` | `Promise<void>` | 틀 고정 설정 |

## ExcelWorkbook API

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `getWorksheet(nameOrIndex)` | `Promise<ExcelWorksheet>` | 워크시트 조회 (이름 또는 0-based 인덱스) |
| `createWorksheet(name)` | `Promise<ExcelWorksheet>` | 새 워크시트 생성 |
| `getWorksheetNames()` | `Promise<string[]>` | 모든 워크시트 이름 반환 |
| `getBytes()` | `Promise<Bytes>` | Uint8Array로 출력 |
| `getBlob()` | `Promise<Blob>` | Blob으로 출력 |
| `close()` | `Promise<void>` | 리소스 해제 |

## 주의사항

### 모든 셀 메서드는 비동기(async)이다

이 라이브러리의 모든 셀 관련 메서드는 `async`로 설계되어 있다. 이는 대용량 파일에서 메모리 효율성을 위한 Lazy Loading 구조 때문이다. 셀 타입에 따라 필요한 XML만 선택적으로 로드한다:

- 문자열 셀 읽기: SharedStrings.xml 로드
- 숫자 셀 읽기: SharedStrings 로드 안함
- 스타일이 있는 셀: Styles.xml 로드

```typescript
// 올바른 사용
const value = await cell.getVal();
await cell.setVal("Hello");

// 잘못된 사용 - Promise 객체가 반환됨
const value = cell.getVal();
cell.setVal("Hello");
```

### 리소스 해제 필수

`ExcelWorkbook`은 내부적으로 ZIP 리소스를 관리하므로, 사용 완료 후 반드시 `close()`를 호출하거나 `await using`을 사용해야 한다. `close()` 호출 후에는 해당 워크북 인스턴스를 사용할 수 없다.

### ExcelWrapper.write()의 리소스 관리

`ExcelWrapper.write()`는 `ExcelWorkbook`을 반환하므로 호출자가 리소스를 관리해야 한다.

```typescript
// 올바른 사용
await using wb = await wrapper.write("Sheet1", records);
const bytes = await wb.getBytes();

// 또는
const wb = await wrapper.write("Sheet1", records);
try {
  const bytes = await wb.getBytes();
} finally {
  await wb.close();
}
```

### 배경색 형식

배경색은 ARGB 8자리 16진수 형식을 사용한다. 반드시 `/^[0-9A-F]{8}$/i` 패턴을 만족해야 하며, 그렇지 않으면 에러가 발생한다.

```
형식: AARRGGBB
  AA = alpha (00=투명, FF=불투명, 단 Excel에서는 반전: 00=불투명)
  RR = red
  GG = green
  BB = blue
```

### 0-based 인덱스

모든 행/열 인덱스는 0-based이다. Excel에서 A1 셀은 `cell(0, 0)`, B3 셀은 `cell(2, 1)`에 해당한다.

## 라이선스

Apache-2.0
