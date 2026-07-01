# @simplysm/excel — ExcelWrapper

Zod object schema 로 Excel 헤더명, 값 변환, 행 검증을 묶어 레코드 배열을 읽고 쓰는 고수준 래퍼. `.describe()` 가 있는 필드는 설명 문자열을 Excel 헤더로 쓰고, 설명이 없으면 필드 key 를 헤더로 쓴다.

## ExcelWrapper

```typescript
class ExcelWrapper<TSchema extends z.ZodObject<z.ZodRawShape>> {
  constructor(schema: TSchema);
  read(file: Bytes | Blob, wsNameOrIndex?: string | number, options?: { excludes?: (keyof z.infer<TSchema>)[] }): Promise<z.infer<TSchema>[]>;
  write(wsName: string, records: Partial<z.infer<TSchema>>[], options?: { excludes?: (keyof z.infer<TSchema>)[] }): Promise<ExcelWorkbook>;
}
```

- `schema` — 레코드 구조를 정의하는 Zod object. 각 field schema 의 `description` 이 Excel 헤더명으로 사용된다.
- `file` — 읽을 Excel 파일 데이터. `ExcelWorkbook(file)` 로 열고 `finally` 에서 닫는다.
- `wsNameOrIndex` — 읽을 워크시트 이름 또는 0 기반 인덱스. 기본값은 `0`.
- `options.excludes` — 읽기/쓰기에서 제외할 schema field key 배열. 제외된 field 는 헤더 매핑과 변환 대상에서 빠진다.
- `wsName` — 새 워크북에 추가할 worksheet 이름.
- `records` — 쓸 레코드 배열. 각 값은 내부에서 `ExcelValueType` 으로 셀에 전달된다.

## read

```typescript
read(file, wsNameOrIndex = 0, options?): Promise<z.infer<TSchema>[]>
```

- 헤더 매핑 — schema shape 의 key 별로 `fieldSchema.description ?? key` 를 display name 으로 만든다.
- 헤더 필터 — worksheet `getDataTable` 의 `usableHeaderNameFn` 으로 기대 display name 만 읽는다.
- 빈 데이터 — 필터된 rawData 길이가 0이면 `[시트명] Excel 파일에서 데이터를 찾을 수 없습니다...` 오류를 throw 한다.
- 빈 행 — 매핑 대상 raw 값이 모두 `null`/`undefined`/빈 문자열이면 결과에서 건너뛴다.
- 검증 실패 — 변환된 record 를 `schema.safeParse` 로 검증하고 실패하면 issue path/message 를 합쳐 throw 한다.
- 리소스 처리 — 성공/실패와 관계없이 내부 workbook 을 `close()` 한다.

값 변환:

- `ZodString` — raw 값이 string 이면 그대로, 아니면 `String(rawValue)` 로 변환한다.
- `ZodNumber` — raw 값이 number 이면 그대로, 아니면 문자열로 바꾼 뒤 `num.parseFloat` 결과를 쓴다.
- `ZodBoolean` — raw boolean 은 그대로, `"1"`/`"true"` 는 true, `"0"`/`"false"` 는 false, 나머지는 `Boolean(rawValue)` 로 변환한다.
- `DateOnly`/`DateTime`/`Time` 인스턴스 — raw 값이 이 인스턴스들이면 그대로 반환한다.
- `ZodOptional`/`ZodNullable` — 변환 타입 판정에서는 내부 schema 로 unwrap 하고, 빈 값 기본값은 `undefined` 다.
- `ZodDefault` — 변환 타입 판정에서는 default 제거 schema 로 unwrap 하고, 빈 값은 `schema.parse(undefined)` 결과를 쓴다.
- required boolean — 빈 값이면 false 를 기본값으로 쓴다.
- 그 외 required 타입 — 빈 값이면 `undefined` 를 넣고 Zod 검증에 맡긴다.

## write

```typescript
write(wsName, records, options?): Promise<ExcelWorkbook>
```

- 워크북 생성 — 새 `ExcelWorkbook()` 을 만들고 `wsName` 시트를 추가한다.
- 헤더 작성 — excludes 를 반영한 schema field 순서대로 0행에 display name 을 쓴다.
- 데이터 작성 — `records` 의 값을 1행부터 셀에 쓴다. 셀에서 지원하지 않는 값이면 `setValue` 오류가 전파된다.
- 테두리 적용 — 헤더와 데이터 영역의 모든 셀에 `border: ["left", "right", "top", "bottom"]` 스타일을 적용한다.
- 필수 헤더 강조 — optional/nullable/default 가 아니고 boolean 이 아닌 field 의 헤더 셀에 `background: "00FFFF00"` 을 적용한다.
- 보기 설정 — `setZoom(85)`, `freezeAt({ r: 0 })`, 헤더+데이터 범위 `setAutoFilter(...)` 를 호출한다.
- 성공 반환 — 열린 `ExcelWorkbook` 을 반환하므로 호출자가 사용 후 `close()` 해야 한다.
- 실패 처리 — 작성 중 오류가 나면 workbook 을 `close()` 하고 같은 오류를 다시 throw 한다.