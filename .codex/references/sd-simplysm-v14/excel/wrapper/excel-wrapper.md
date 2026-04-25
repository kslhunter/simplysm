# `ExcelWrapper`

> **읽어야 하는 상황**: Zod 스키마로 정형화된 레코드 구조의 Excel 파일을 타입 안전하게 읽기/쓰기할 때. 셀 단위 세밀한 조작(병합, 이미지, 수식 등)이 필요하면 [`ExcelWorkbook`](../core-classes/excel-workbook.md) + [`ExcelWorksheet`](../core-classes/excel-worksheet.md) 참조.

Zod 스키마 기반 타입 안전한 Excel 읽기/쓰기 래퍼. 스키마에서 타입 정보를 추론하여 타입 안전한 읽기/쓰기를 제공한다.

## When to use

- ✅ 정형화된 레코드 구조의 Excel 파일을 읽기/쓰기할 때 (업로드/다운로드 시나리오)
- ✅ Zod 스키마로 유효성 검사를 자동 수행하고 싶을 때
- ❌ 셀 단위 세밀한 조작(병합, 이미지 삽입, 수식 등)이 필요하면 [`ExcelWorkbook`](../core-classes/excel-workbook.md) + [`ExcelWorksheet`](../core-classes/excel-worksheet.md)를 직접 사용

## Signature

```typescript
export class ExcelWrapper<TSchema extends z.ZodObject<z.ZodRawShape>> {
  constructor(schema: TSchema);

  async read(
    file: Bytes | Blob,
    wsNameOrIndex?: string | number,
    options?: { excludes?: (keyof z.infer<TSchema>)[] },
  ): Promise<z.infer<TSchema>[]>;

  async write(
    wsName: string,
    records: Partial<z.infer<TSchema>>[],
    options?: { excludes?: (keyof z.infer<TSchema>)[] },
  ): Promise<ExcelWorkbook>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `constructor` | method | `(schema: TSchema) => ExcelWrapper<TSchema>` | Zod 스키마를 받아 인스턴스 생성. `.describe()`로 Excel 헤더 이름을 지정한다 |
| `read` | method | `(file, wsNameOrIndex?, options?) => Promise<z.infer<TSchema>[]>` | Excel 파일을 레코드 배열로 읽기. 스키마 유효성 검사 수행 |
| `write` | method | `(wsName, records, options?) => Promise<ExcelWorkbook>` | 레코드 배열을 Excel 워크북으로 변환. 반환된 워크북의 `close()`는 호출자 책임 |

## Parameters

### `read(file, wsNameOrIndex?, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `Bytes \| Blob` | Excel 파일 데이터 |
| `wsNameOrIndex` | `string \| number` | 워크시트 이름 또는 0 기반 인덱스 (기본값: `0`) |
| `options.excludes` | `(keyof z.infer<TSchema>)[] \| undefined` | 읽기에서 제외할 필드 키 배열 |

**타입 변환 규칙:**

| 스키마 타입 | 변환 동작 |
|------------|-----------|
| `z.string()` | 문자열로 변환 (`String(rawValue)`) |
| `z.number()` | 숫자로 파싱 (`num.parseFloat`) |
| `z.boolean()` | `"1"`, `"true"` → `true`, `"0"`, `"false"` → `false` |
| `z.optional()` / `z.nullable()` | 빈 셀을 `undefined`로 반환 |
| `z.default(value)` | 빈 셀에 기본값 적용 |
| `DateOnly` / `DateTime` / `Time` | `instanceof`로 직접 전달 |

### `write(wsName, records, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `wsName` | `string` | 워크시트 이름 |
| `records` | `Partial<z.infer<TSchema>>[]` | 레코드 배열 |
| `options.excludes` | `(keyof z.infer<TSchema>)[] \| undefined` | 쓰기에서 제외할 필드 키 배열 |

**쓰기 동작:**

- 첫 번째 행에 헤더 자동 생성 (스키마의 `.describe()` 값 사용)
- 모든 셀에 테두리 스타일 자동 적용
- 필수 비boolean 필드의 헤더에 노란색 배경(`00FFFF00`) 강조
- 확대/축소 85%, 첫 번째 행 틀 고정 자동 설정
- 내부에서 에러 발생 시 워크북이 자동으로 `close()`됨

## Usage

```typescript
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("이름"),
  age: z.number().describe("나이"),
  email: z.string().optional().describe("이메일"),
  active: z.boolean().default(false).describe("활성"),
});

const wrapper = new ExcelWrapper(schema);

// 쓰기 (시트명, 레코드 배열)
const wb = await wrapper.write("사람", [
  { name: "김철수", age: 30, email: "kim@example.com" },
  { name: "이영희", age: 28 },
]);
try {
  const bytes = await wb.toBytes();
} finally {
  await wb.close();
}

// 읽기 (시트명 또는 인덱스, 기본값: 0)
const records = await wrapper.read(bytes, "사람");
// z.infer<typeof schema>[] 타입으로 반환

// excludes 옵션으로 특정 필드 제외
const filtered = await wrapper.read(bytes, 0, { excludes: ["email"] });
```
