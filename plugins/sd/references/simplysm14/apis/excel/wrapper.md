# @simplysm/excel — ExcelWrapper

Zod object schema 로 Excel 파일을 타입 안전하게 읽고 쓰는 고수준 래퍼.
각 필드의 `.describe()` 설명을 Excel 헤더명으로 사용(미설정 시 필드 key).
읽을 때 Zod 로 타입 변환, 유효성 검사, 쓸 때 필드별 스타일(테두리, 필수 필드 강조) 자동 적용.

화면 목록 데이터 엑셀 다운로드/업로드는 [../../manuals/client-crud.md](../../manuals/client-crud.md) 참조.

## ExcelWrapper

```typescript
class ExcelWrapper<TSchema extends z.ZodObject<z.ZodRawShape>> {
  constructor(schema: TSchema);
  read(
    file: Bytes | Blob,
    wsNameOrIndex?: string | number,
    options?: { excludes?: (keyof z.infer<TSchema>)[] },
  ): Promise<z.infer<TSchema>[]>;
  write(
    wsName: string,
    records: Partial<z.infer<TSchema>>[],
    options?: { excludes?: (keyof z.infer<TSchema>)[] },
  ): Promise<ExcelWorkbook>;
}
```

- `schema` — 레코드 구조를 정의하는 Zod object. 각 field schema 의 `description` 이 Excel 헤더명으로 쓰임(없으면 field key).
- `file` — 읽을 Excel 파일 데이터. 내부에서 `ExcelWorkbook(file)` 로 열고 `finally` 에서 `close()` 함.
- `wsNameOrIndex` — 읽을 워크시트 이름 또는 0 기반 인덱스. 기본값 `0`.
- `options.excludes` — 읽기/쓰기에서 제외할 schema field key 배열. 제외된 field 는 헤더 매핑, 변환 대상에서 빠짐.
- `wsName` — 새 워크북에 추가할 worksheet 이름.
- `records` — 쓸 레코드 배열(`Partial`). 각 값은 내부에서 `ExcelValueType` 으로 셀에 전달됨.

## read

```typescript
read(file, wsNameOrIndex = 0, options?): Promise<z.infer<TSchema>[]>
```

- 헤더 매핑 — schema shape 의 key 별 `fieldSchema.description ?? key` 를 display name 으로 만듦.
- 헤더 필터 — worksheet `getDataTable` 의 `usableHeaderNameFn` 으로 기대 display name 만 읽음.
- 빈 데이터 — 필터된 rawData 길이가 0이면 `[시트명] Excel 파일에서 데이터를 찾을 수 없습니다 ...` 오류를 throw 함.
- 빈 행 — 매핑 대상 raw 값이 모두 `null`/`undefined`/빈 문자열이면 결과에서 건너뜀.
- 검증 — 변환된 record 를 `schema.safeParse` 로 검증하고, 실패 시 issue path/message 를 합쳐 throw 함.
- 리소스 — 성공/실패와 무관하게 내부 workbook 을 `close()` 함.

값 변환(`_convertValue`):

- 빈 값(`null`/`undefined`/`""`) — schema 기본값을 씀(`ZodDefault` 면 `schema.parse(undefined)`, optional/nullable 이면 `undefined`, required boolean 이면 `false`, 그 외 required 면 `undefined`).
- `ZodString` — raw 값이 string 이면 그대로, 아니면 `String(rawValue)`.
- `ZodNumber` — raw 값이 number 이면 그대로, 아니면 `num.parseFloat(String(rawValue))`.
- `ZodBoolean` — raw boolean 은 그대로, `"1"`/`"true"`→`true`, `"0"`/`"false"`→`false`, 나머지는 `Boolean(rawValue)`.
- `DateOnly`/`DateTime`/`Time` 인스턴스 — 그대로 반환함.
- unwrap — `ZodOptional`/`ZodNullable` 은 inner schema 로, `ZodDefault` 는 default 제거 schema 로 풀어 위 분기를 적용함.

## write

```typescript
write(wsName, records, options?): Promise<ExcelWorkbook>
```

- 워크북 생성 — 새 `ExcelWorkbook()` 을 만들고 `wsName` 시트를 추가함.
- 헤더 — excludes 반영한 schema field 순서대로 0행에 display name 을 씀.
- 데이터 — 1행부터 `records` 값을 `cell(r,c).setValue` 로 씀. 셀에서 지원하지 않는 값이면 `setValue` 오류가 전파됨.
- 테두리 — 헤더+데이터 영역의 모든 셀에 `border: ["left","right","top","bottom"]` 를 적용함.
- 필수 헤더 강조 — optional/nullable/default 가 아니고 boolean 도 아닌 field 의 헤더 셀에 `background: "00FFFF00"`(노란색)을 적용함.
- 보기 — `setZoom(85)`, `freezeAt({ r: 0 })`, 헤더+데이터 범위 `setAutoFilter(...)` 를 호출함.
- 반환 — 열린 `ExcelWorkbook` 을 반환하므로 호출자가 사용 후 `close()` 해야 함.
- 실패 처리 — 작성 중 오류가 나면 workbook 을 `close()` 하고 같은 오류를 다시 throw 함.
