# @simplysm/excel — ExcelWrapper

Zod 스키마로 엑셀 헤더 ↔ 필드 매핑, 셀 값 타입 변환, 행 단위 유효성 검사를 자동화해 "레코드 배열 ↔ 엑셀" 변환을 한 번에 처리하는 고수준 래퍼. 헤더 텍스트는 각 필드의 `.describe()` 로 지정하며, 미지정 필드는 키 이름을 헤더로 쓴다. 클라이언트 화면의 엑셀 다운로드(`write`)·업로드(`read`)에서 같은 wrapper 인스턴스를 공유하는 패턴에 쓰인다.

## 생성

```typescript
new ExcelWrapper<TSchema extends z.ZodObject>(_schema: TSchema)
```

- `_schema` — Zod 객체 스키마. 각 필드가 한 컬럼이 되고, `.describe("헤더명")` 으로 엑셀 헤더를 지정한다.

## read

```typescript
read(
  file: Bytes | Blob,
  wsNameOrIndex: string | number = 0,
  options?: { excludes?: (keyof z.infer<TSchema>)[] },
): Promise<z.infer<TSchema>[]>
```

엑셀 파일을 레코드 배열로 읽는다. 헤더는 스키마 displayName(`.describe()`)으로 매칭한 컬럼만 채택. 전부 빈 값인 행은 건너뛴다. 각 행을 스키마로 `safeParse` 하며 실패 시 시트명 + 상세 메시지로 throw. 데이터가 0건이면 throw. 내부에서 워크북을 열고 finally 로 `close` 까지 책임진다.

- `file` — 엑셀 바이트 또는 Blob.
- `wsNameOrIndex` — 읽을 시트 이름 또는 0 기반 인덱스(기본 0).
- `options.excludes` — 읽기에서 제외할 필드 키 배열(파생 컬럼 등). 매핑·파싱에서 빠진다.

값 변환: 빈 셀/빈 문자열은 `ZodDefault` 면 기본값, `optional`/`nullable` 이면 `undefined`, 필수 boolean 이면 `false` 로 채운다. 그 외에는 스키마 inner 타입(String/Number/Boolean)에 맞춰 변환(`"1"`/`"true"` → `true` 등), `DateOnly`/`DateTime`/`Time` 인스턴스는 그대로 보존.

## write

```typescript
write(
  wsName: string,
  records: Partial<z.infer<TSchema>>[],
  options?: { excludes?: (keyof z.infer<TSchema>)[] },
): Promise<ExcelWorkbook>
```

레코드 배열을 엑셀 워크북으로 변환해 반환. 0 행에 헤더, 이후 행에 데이터를 쓰고, 표 전체에 테두리, 필수(non-optional/nullable/default)이면서 boolean 이 아닌 필드 헤더에 노란 배경(`00FFFF00`)을 칠한다. zoom 85%, 0 행 틀고정, 헤더~데이터 전체 범위 자동 필터를 설정한다. 변환 중 예외 발생 시 워크북을 `close` 하고 re-throw 한다(부분 산출물 방지).

- `wsName` — 생성할 시트 이름.
- `records` — 쓸 레코드 배열(`Partial` — 일부 필드 누락 허용).
- `options.excludes` — 컬럼에서 제외할 필드 키 배열.

반환된 워크북의 리소스 관리는 호출자 책임 — 사용 후 `close()` 해야 한다.

## 사용 예

다운로드/업로드에서 같은 wrapper 를 공유한다.

```typescript
private readonly _excelWrapper = new ExcelWrapper(
  z.object({
    id: z.number().optional().describe("ID"),
    name: z.string().describe("이름"),
    lastModifiedAt: z.instanceof(DateTime).optional().describe("수정일시"),
  }),
);

// 다운로드
const wb = await this._excelWrapper.write(this.viewTitle(), items);
try {
  downloadBlob(await wb.toBlob(), `${this.viewTitle()}_${new DateTime().toFormatString("yyMMdd")}.xlsx`);
} finally {
  await wb.close();
}

// 업로드 (파생 컬럼은 제외)
const records = await this._excelWrapper.read(files[0], 0, {
  excludes: ["lastModifiedAt"],
});
```

## 주의사항

- `write` 반환 워크북은 호출자가 `close()` 해야 한다(`read` 는 내부에서 자동 close).
- 빈 데이터(0건) 읽기·스키마 검증 실패는 silent skip 없이 throw — 부분 처리하지 않는다.
- 다운로드 파일명·`downloadBlob` 사용법은 client-crud 매뉴얼 및 [core-browser README](../core-browser/README.md) 참조.
