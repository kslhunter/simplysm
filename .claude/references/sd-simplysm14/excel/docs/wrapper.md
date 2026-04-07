# Wrapper

## `ExcelWrapper`

Zod 스키마 기반 타입 안전한 Excel 읽기/쓰기 래퍼. 스키마에서 타입 정보를 추론하여 타입 안전한 읽기/쓰기를 제공한다.

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

### Constructor

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `TSchema extends z.ZodObject<z.ZodRawShape>` | Zod 스키마. `.describe()`로 Excel 헤더 이름을 지정한다 |

### Methods

#### `read(file, wsNameOrIndex?, options?)`

Excel 파일을 레코드 배열로 읽는다. 헤더 행의 텍스트를 스키마의 `.describe()` 값과 매칭하여 필드를 연결한다. Zod 스키마로 유효성 검사를 수행하며, 실패 시 에러를 던진다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `Bytes \| Blob` | Excel 파일 데이터 |
| `wsNameOrIndex` | `string \| number` | 워크시트 이름 또는 0 기반 인덱스 (기본값: `0`) |
| `options.excludes` | `(keyof z.infer<TSchema>)[]` | 읽기에서 제외할 필드 키 배열 |

**반환값:** `z.infer<TSchema>[]` - 스키마 타입으로 추론된 레코드 배열

**타입 변환 규칙:**

| 스키마 타입 | 변환 동작 |
|------------|-----------|
| `z.string()` | 문자열로 변환 (`String(rawValue)`) |
| `z.number()` | 숫자로 파싱 (`num.parseFloat`) |
| `z.boolean()` | `"1"`, `"true"` -> `true`, `"0"`, `"false"` -> `false` |
| `z.optional()` / `z.nullable()` | 빈 셀을 `undefined`로 반환 |
| `z.default(value)` | 빈 셀에 기본값 적용 |
| `DateOnly` / `DateTime` / `Time` | `instanceof`로 직접 전달 |

#### `write(wsName, records, options?)`

레코드 배열을 Excel 워크북으로 변환한다. 반환된 `ExcelWorkbook`의 리소스 관리는 호출자의 책임이다. 내부에서 에러 발생 시 워크북이 자동으로 `close()`된다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `wsName` | `string` | 워크시트 이름 |
| `records` | `Partial<z.infer<TSchema>>[]` | 레코드 배열 |
| `options.excludes` | `(keyof z.infer<TSchema>)[]` | 쓰기에서 제외할 필드 키 배열 |

**반환값:** `ExcelWorkbook` - 호출자가 `close()` 또는 `await using`으로 리소스를 관리해야 한다

**쓰기 동작:**

- 첫 번째 행에 헤더 자동 생성 (스키마의 `.describe()` 값 사용)
- 모든 셀에 테두리 스타일 자동 적용
- 필수 비boolean 필드의 헤더에 노란색 배경(`00FFFF00`) 강조
- 확대/축소 85%, 첫 번째 행 틀 고정 자동 설정
