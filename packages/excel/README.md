# @simplysm/excel

**이 문서는 패키지 사용자를 위한 가이드입니다.**
**개발자용 가이드는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.**

---

브라우저/Node.js 환경에서 사용 가능한 Excel 파일(OOXML) 처리 라이브러리입니다.

## 설치

```bash
yarn add @simplysm/excel
```

## 요구사항

- Node.js 20.x (LTS) 또는 Chrome 79+
- TypeScript 5.8.x

## 사용법

### 워크북 생성

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// 새 워크북 생성
const wb = new ExcelWorkbook();

// 기존 파일 열기
const wb = new ExcelWorkbook(buffer);
const wb = new ExcelWorkbook(blob);
```

### 워크시트 조작

```typescript
// 워크시트 생성
const ws = await wb.createWorksheet("Sheet1");

// 워크시트 가져오기 (이름 또는 인덱스)
const ws = await wb.getWorksheet("Sheet1");
const ws = await wb.getWorksheet(0);

// 워크시트 이름 목록
const names = await wb.getWorksheetNames();
```

### 셀 조작

```typescript
// 값 설정/가져오기
await ws.cell(0, 0).setVal("Hello");
const val = await ws.cell(0, 0).getVal();

// 수식
await ws.cell(0, 2).setFormula("A1+B1");

// 병합 (현재 셀에서 상대 위치로)
await ws.cell(0, 0).merge(1, 1);  // (0,0)부터 (1,1)까지 병합
```

### 스타일 설정

```typescript
await ws.cell(0, 0).setStyle({
  background: "00FF0000",  // ARGB 형식 (alpha + RGB)
  horizontalAlign: "center",  // "center" | "left" | "right"
  verticalAlign: "center",    // "center" | "top" | "bottom"
  border: ["left", "right", "top", "bottom"],
  numberFormat: "number",     // "number" | "string" | "DateOnly" | "DateTime" | "Time"
});
```

### 이미지 삽입

```typescript
await ws.addImage({
  buffer: imageBuffer,
  ext: "png",
  from: { r: 0, c: 0 },
  to: { r: 4, c: 4 },
});
```

### 뷰 설정

```typescript
// 줌 배율
await ws.setZoom(85);

// 틀 고정 (1행 고정)
await ws.setFix({ r: 0 });
```

### 저장

```typescript
// Buffer로 저장
const buffer = await wb.getBuffer();

// Blob으로 저장 (브라우저)
const blob = await wb.getBlob();

// 리소스 해제
await wb.close();
```

### ExcelWrapper (Zod 스키마 기반)

타입 안전한 Excel 읽기/쓰기를 위한 래퍼 클래스입니다.

```typescript
import { z } from "zod";
import { ExcelWrapper } from "@simplysm/excel";
import { DateOnly } from "@simplysm/core-common";

// 스키마 정의
const schema = z.object({
  name: z.string(),
  age: z.number(),
  birthDate: z.instanceof(DateOnly).optional(),
});

// 래퍼 생성 (필드별 헤더명 매핑)
const wrapper = new ExcelWrapper(schema, {
  name: "이름",
  age: "나이",
  birthDate: "생년월일",
});

// Excel 읽기 → 레코드 배열
const records = await wrapper.read(file);
// records: { name: string; age: number; birthDate?: DateOnly }[]

// 레코드 배열 → Excel 워크북
const wb = await wrapper.write("직원목록", records);
const buffer = await wb.getBuffer();
```

## API

### ExcelWorkbook

| 메서드 | 설명 |
|--------|------|
| `constructor(arg?)` | 새 워크북 생성 또는 기존 파일 열기 (Buffer/Blob) |
| `createWorksheet(name)` | 새 워크시트 생성 |
| `getWorksheet(nameOrIndex)` | 워크시트 가져오기 |
| `getWorksheetNames()` | 워크시트 이름 목록 |
| `addMedia(buffer, ext)` | 미디어 파일 추가 |
| `getBuffer()` | Buffer로 저장 |
| `getBlob()` | Blob으로 저장 |
| `close()` | 리소스 해제 |

### ExcelWorksheet

| 메서드 | 설명 |
|--------|------|
| `cell(r, c)` | 셀 접근 |
| `row(r)` | 행 접근 |
| `col(c)` | 열 접근 |
| `cell(r,c).merge(r,c)` | 셀 병합 |
| `addImage(options)` | 이미지 삽입 |
| `setZoom(scale)` | 줌 배율 설정 |
| `setFix(pos)` | 틀 고정 |
| `getDataTable(options?)` | 데이터 테이블로 읽기 |

### ExcelCell

| 메서드 | 설명 |
|--------|------|
| `getVal()` | 값 가져오기 |
| `setVal(value)` | 값 설정 |
| `setFormula(formula)` | 수식 설정 |
| `setStyle(options)` | 스타일 설정 |

### ExcelWrapper

| 메서드 | 설명 |
|--------|------|
| `constructor(schema, displayNameMap)` | 래퍼 생성 |
| `read(file, wsNameOrIndex?)` | Excel → 레코드 배열 |
| `write(wsName, records)` | 레코드 배열 → 워크북 |

## 관련 패키지

| 패키지 | 관계 |
|--------|------|
| `@simplysm/core-common` | SdZip, XmlConvert, 타입들 |

## 라이선스

MIT
