# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/excel` - xlsx 파일 읽기/쓰기 라이브러리. DOM-independent (neutral) 환경에서 동작한다. 18개 TypeScript 소스 파일.

## Architecture

```
src/
├── excel-workbook.ts     ← 워크북 진입점: 워크시트 생성/조회, ZIP 리소스 관리
├── excel-worksheet.ts    ← 워크시트: 셀/행/열 접근, 이미지 삽입, 데이터 읽기/쓰기
├── excel-cell.ts         ← 셀: 값/수식/스타일/병합 처리
├── excel-row.ts          ← 행: 셀 일괄 접근
├── excel-col.ts          ← 열: 셀 일괄 접근, 너비 설정
├── excel-wrapper.ts      ← Zod 스키마 기반 타입 안전한 읽기/쓰기 래퍼
├── types.ts              ← XML 데이터 구조, 값 타입, 주소 타입, 스타일 타입
├── utils/
│   ├── excel-utils.ts    ← 셀 주소 변환, 날짜↔숫자 변환, numFmt 매핑 (정적 메서드)
│   └── zip-cache.ts      ← ZIP 아카이브 Lazy Loading 캐시 (XML 파싱 포함)
└── xml/
    ├── excel-xml-content-type.ts   ← [Content_Types].xml 처리
    ├── excel-xml-drawing.ts        ← drawing*.xml 처리 (이미지 앵커)
    ├── excel-xml-relationship.ts   ← *.rels 처리
    ├── excel-xml-shared-string.ts  ← sharedStrings.xml 처리
    ├── excel-xml-style.ts          ← styles.xml 처리
    ├── excel-xml-unknown.ts        ← 미인식 XML 파일 보존용
    ├── excel-xml-workbook.ts       ← workbook.xml 처리
    └── excel-xml-worksheet.ts      ← worksheet*.xml 처리
```

### Lazy Loading 아키텍처

`ZipCache`가 ZIP 내부 XML 파일을 최초 접근 시에만 읽고 파싱한다. 모든 셀 메서드가 `async`인 이유가 이 때문이다 — 셀 타입에 따라 필요한 XML만 선택적으로 로드한다(문자열 셀만 sharedStrings.xml을 로드, 숫자 셀은 로드하지 않음).

## Key Patterns

### 워크북 생성 및 리소스 관리

`ExcelWorkbook`은 내부적으로 ZIP 리소스를 보유하므로, 반드시 `try-finally` 블록에서 `close()`를 호출한다.

```typescript
// 신규 생성
const wb = new ExcelWorkbook();
try {
  const ws = await wb.addWorksheet("Sheet1");
  await ws.cell(0, 0).setValue("값");
  const bytes = await wb.toBytes();
} finally {
  await wb.close();
}

// 기존 파일 읽기 (Uint8Array 또는 Blob)
const wb = new ExcelWorkbook(bytes);
try {
  const ws = await wb.getWorksheet(0); // 인덱스(0 기반) 또는 시트명
} finally {
  await wb.close();
}
```

`ExcelWrapper.write()`가 반환하는 `ExcelWorkbook`은 호출자가 직접 닫아야 한다. `ExcelWrapper.write()` 내부에서 에러 발생 시 자동으로 `close()`를 호출한다.

### 셀 주소 체계

모든 좌표는 **0 기반** 인덱스다. `ExcelUtils`의 정적 메서드로 "A1" 형식 문자열과 상호 변환한다.

```typescript
// 0 기반 좌표로 셀 접근
ws.cell(0, 0)  // A1
ws.cell(2, 3)  // D3
ws.row(0)      // 1행 전체
ws.col(1)      // B열 전체

// 주소 변환
ExcelUtils.stringifyAddr({ r: 0, c: 0 })  // "A1"
ExcelUtils.parseCellAddr("B3")            // { r: 2, c: 1 }
```

### 날짜/시간 타입 처리

`DateOnly`, `DateTime`, `Time` 인스턴스를 직접 `setValue()`에 전달한다. 내부적으로 Excel 날짜 숫자로 변환하고, numFmtId를 셀 스타일에 기록하여 읽기 시 원본 타입으로 복원한다.

```typescript
await ws.cell(0, 0).setValue(new DateOnly(2024, 6, 15));
const val = await ws.cell(0, 0).getValue(); // DateOnly 인스턴스 반환
```

### Zod 스키마 기반 래퍼

`ExcelWrapper`는 Zod `ZodObject` 스키마를 받아 타입 안전한 읽기/쓰기를 제공한다. 스키마 필드의 `.describe("헤더명")`이 Excel 헤더 텍스트가 된다.

```typescript
const schema = z.object({
  name: z.string().describe("이름"),
  age: z.number().describe("나이"),
  email: z.string().optional().describe("이메일"),
});

const wrapper = new ExcelWrapper(schema);

// 쓰기
const wb = await wrapper.write("Sheet1", records);
try {
  const bytes = await wb.toBytes();
} finally {
  await wb.close();
}

// 읽기 (시트명 또는 인덱스, 기본값: 0)
const records = await wrapper.read(bytes, "Sheet1");
```

- `z.optional()` / `z.nullable()` / `z.default()` 래핑 필드: 빈 셀을 `undefined`로 반환하거나 기본값 적용
- `z.boolean()` + `z.default(false)`: 빈 셀을 `false`로 반환
- 필수 비boolean 필드: 헤더 배경을 노란색(`00FFFF00`)으로 강조
- `excludes` 옵션으로 특정 필드를 읽기/쓰기에서 제외 가능

### 스타일 설정

`ExcelStyleOptions`을 사용하며, `background`는 ARGB 8자리 16진수(`alpha(반전)+rgb`)다.

```typescript
await ws.cell(0, 0).setStyle({
  background: "00FFFF00",                   // 노란색
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
  verticalAlign: "center",
  numberFormat: "DateOnly",
});
```

### 이미지 삽입

`ExcelWorksheet.addImage()`를 사용한다. `from`/`to`는 0 기반 행/열 인덱스이며, 오프셋은 EMU 단위다.

```typescript
await ws.addImage({
  bytes: imageBytes,
  ext: "png",
  from: { r: 1, c: 1 },
  to: { r: 5, c: 4 },
});
```

### XML 레이어 직접 접근

`xml/` 디렉터리의 클래스들은 내부 구현에만 사용한다. 퍼블릭 API(`ExcelWorkbook`, `ExcelWorksheet`, `ExcelCell`, `ExcelWrapper`, `ExcelUtils`)만 외부에서 사용한다.

`ExcelXml` 인터페이스를 구현하는 클래스는 `data` 프로퍼티와 `cleanup()` 메서드를 가진다. `cleanup()`은 `ZipCache.toBytes()` 직전에 호출되어 직렬화 전 데이터를 정리한다.

## Testing

**프레임워크**: Vitest

테스트 파일은 `tests/` 루트에 평탄하게 배치된다. `tests/fixtures/`에 실제 xlsx 파일과 이미지가 있다.

```
tests/
├── batch-write.spec.ts          ← 대량 쓰기 성능/정확성
├── cell-identity.spec.ts        ← 동일 좌표에서 동일 ExcelCell 인스턴스 반환 검증
├── excel-cell.spec.ts           ← 셀 값/수식/스타일/병합
├── excel-col.spec.ts            ← 열 너비, 셀 일괄 접근
├── excel-row.spec.ts            ← 행 셀 일괄 접근
├── excel-workbook.spec.ts       ← 워크북 생성/읽기/내보내기/리소스 정리
├── excel-worksheet.spec.ts      ← 워크시트 기능 전반
├── excel-wrapper.spec.ts        ← Zod 스키마 기반 읽기/쓰기/오류 처리
├── image-insert.spec.ts         ← 이미지 삽입
├── utils/excel-utils.spec.ts    ← ExcelUtils 단위 테스트
├── xml/                         ← XML 레이어 단위 테스트
│   ├── excel-xml-relationship.spec.ts
│   └── excel-xml-shared-string.spec.ts
└── fixtures/
    ├── 초기화.xlsx               ← 실제 xlsx 파일 (워크북 읽기 테스트용)
    └── logo.png                  ← 이미지 삽입 테스트용
```

Node.js/브라우저 양쪽에서 실행 가능하도록 `fixtures` 파일 로드 시 환경을 분기한다:

```typescript
const url = new URL("./fixtures/초기화.xlsx", import.meta.url);
if (!("window" in globalThis)) {
  const fs = await import("node:fs" as string);
  const { fileURLToPath } = await import("node:url" as string);
  wb = new ExcelWorkbook(new Uint8Array(fs.readFileSync(fileURLToPath(url))));
} else {
  const response = await fetch(url);
  wb = new ExcelWorkbook(new Uint8Array(await response.arrayBuffer()));
}
```

## 컴파일러 설정 (패키지 고유)

`tsconfig.json`에서 `"lib": ["ESNext", "WebWorker"]`를 사용한다. `DOM` lib를 포함하지 않으므로 `document`, `window`, `HTMLElement` 등 DOM API를 직접 사용할 수 없다. 브라우저와 Node.js 양쪽에서 동작해야 하는 neutral 패키지이기 때문이다.
