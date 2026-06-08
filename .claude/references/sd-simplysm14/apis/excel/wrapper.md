# @simplysm/excel — ExcelWrapper

Zod 스키마로 엑셀 헤더 ↔ 필드 매핑, 셀 값 타입 변환, 행 단위 유효성 검사를 자동화해 "레코드 배열 ↔ 엑셀" 변환을 한 번에 처리할 때 쓰는 고수준 래퍼. 헤더 텍스트는 각 필드의 `.describe()` 로 지정하며, 미지정 필드는 키 이름을 헤더로 쓴다. 표준 입력 양식 업로드/다운로드 같은 정형 변환에 적합.

## 생성자

```typescript
new ExcelWrapper<TSchema extends z.ZodObject<z.ZodRawShape>>(schema: TSchema)
```

- `schema: TSchema` — 레코드 구조를 정의하는 Zod 객체 스키마. 각 필드에 `.describe("헤더이름")` 으로 엑셀 헤더 표시명을 지정한다. optional/nullable/default/boolean 여부가 읽기 기본값·필수 강조·타입 변환 동작을 결정한다.

## read

```typescript
read(
  file: Bytes | Blob,
  wsNameOrIndex: string | number = 0,
  options?: { excludes?: (keyof z.infer<TSchema>)[] },
): Promise<z.infer<TSchema>[]>
```

- `file: Bytes | Blob` — 읽을 .xlsx 데이터.
- `wsNameOrIndex: string | number` — 읽을 시트 이름 또는 0 기반 인덱스. 기본 `0`(첫 시트).
- `options.excludes?: (keyof Schema)[]` — 매핑에서 제외할 필드 키 배열. 해당 헤더는 읽지 않음.

동작: 스키마 표시명 집합에 해당하는 헤더만 골라 데이터 테이블을 읽고, 각 행을 필드 키로 역매핑한 뒤 값 변환 → Zod `safeParse` 검증한다. 빈/누락 값은 스키마 기본값 규칙(아래)으로 채우고, 한 행의 모든 매핑 값이 비면 그 행은 건너뛴다. 데이터가 0건이거나 검증 실패면 시트명을 포함해 throw(부분 반영 없이 전체 중단). 워크북은 내부에서 열고 finally 로 닫는다.

값 변환 규칙(빈/누락이 아닌 값에 적용, optional/nullable/default 는 내부 타입으로 unwrap 후 판정):

- `ZodString` → 문자열(비문자열은 `String()`).
- `ZodNumber` → `num.parseFloat`.
- `ZodBoolean` → `"1"`/`"true"`→`true`, `"0"`/`"false"`→`false`, 그 외 `Boolean()`.
- `DateOnly`/`DateTime`/`Time` 인스턴스 → 그대로 보존.
- 빈/누락 값(`null`/`""`) → 스키마 기본값: `ZodDefault` 면 그 기본값, optional/nullable 면 `undefined`, 필수 boolean 이면 `false`, 그 외 `undefined`.

## write

```typescript
write(
  wsName: string,
  records: Partial<z.infer<TSchema>>[],
  options?: { excludes?: (keyof z.infer<TSchema>)[] },
): Promise<ExcelWorkbook>
```

- `wsName: string` — 만들 시트 이름.
- `records: Partial<Schema>[]` — 출력할 레코드 배열(부분 객체 허용 — 누락 키는 빈 셀).
- `options.excludes?: (keyof Schema)[]` — 출력에서 제외할 필드 키 배열.

동작: 새 워크북에 시트 1개를 만들고, 0행에 표시명 헤더, 1행부터 각 레코드 값을 스키마 키 순서대로 쓴다. 전체 표에 4변 테두리, 필수(non-optional·non-nullable·non-default)이며 boolean 이 아닌 필드의 헤더 셀에 노란 배경(`"00FFFF00"`) 강조, zoom 85%, 0행 틀고정, 표 전체 범위(헤더행~마지막 데이터행)에 헤더 자동 필터(드롭다운)를 적용한다. **반환된 워크북의 close 는 호출자 책임** — 사용 후 반드시 `close()`(write 내부에서 실패 시에는 직접 close 후 rethrow).

## 사용 예

```typescript
const schema = z.object({
  code: z.string().describe("코드"),
  qty: z.number().describe("수량"),
  note: z.string().optional().describe("비고"),
});
const wrapper = new ExcelWrapper(schema);

// 읽기
const records = await wrapper.read(bytes, "입력", { excludes: ["note"] });

// 쓰기 (워크북 close 는 호출자 책임)
const wb = await wrapper.write("결과", records);
try {
  const bytes = await wb.toBytes();
} finally {
  await wb.close();
}
```

## 주의사항

- 헤더 매핑은 `.describe()` 값(미지정 시 키)이 엑셀 헤더 텍스트와 정확히 일치해야 한다. 매핑되는 헤더가 한 행 내 중복이거나 데이터가 0건이면 throw.
- `read` 는 행 단위 Zod 검증을 거치므로, 한 행이라도 스키마 위반이면 전체가 throw(부분 결과 없음).
- `write` 의 필수 헤더 노랑 강조는 "필수 입력 칸" 안내 목적 — optional/nullable/default 또는 boolean 필드는 강조되지 않는다.
- 결측 보존: optional/nullable 필드의 빈 값은 `undefined` 로 유지된다(임의 치환 없음). 필수 boolean 만 `false` 로 채워진다.
