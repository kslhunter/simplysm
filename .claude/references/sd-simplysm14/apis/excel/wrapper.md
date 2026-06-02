# @simplysm/excel — ExcelWrapper

Zod 스키마 1개로 레코드 배열 ↔ Excel 파일을 타입 안전하게 매핑할 때 읽는다. 스키마 각 필드의 `.describe()` 가 Excel 헤더(표시명)가 되고, 필드 타입으로 읽기 시 값 변환·검증을 수행한다. 저수준 셀 조작 없이 "정형 데이터의 import/export" 용도일 때 사용.

## 시그니처

```typescript
new ExcelWrapper<TSchema extends z.ZodObject<z.ZodRawShape>>(schema: TSchema)

read(
  file: Bytes | Blob,
  wsNameOrIndex: string | number = 0,
  options?: { excludes?: (keyof z.infer<TSchema>)[] },
): Promise<z.infer<TSchema>[]>

write(
  wsName: string,
  records: Partial<z.infer<TSchema>>[],
  options?: { excludes?: (keyof z.infer<TSchema>)[] },
): Promise<ExcelWorkbook>
```

- `schema: z.ZodObject` — 레코드 구조. 각 필드의 `.describe("표시명")` 이 Excel 헤더명. 미지정 시 필드 키를 헤더로 사용.
- `read.file: Bytes | Blob` — 읽을 .xlsx 데이터.
- `read.wsNameOrIndex: string | number` — 대상 시트(기본 0번). 이름 또는 0 기반 인덱스.
- `read.options.excludes?: (keyof ...)[]` — 매핑에서 제외할 필드 키 목록.
- `write.wsName: string` — 생성할 시트 이름.
- `write.records: Partial<...>[]` — 기록할 부분 레코드 배열. 누락 필드는 빈 셀.
- `write.options.excludes?: (keyof ...)[]` — 출력에서 제외할 필드 키 목록.

## read 동작

- 헤더명↔필드 역매핑 후 `ws.getDataTable({ usableHeaderNameFn })` 로 표시명에 일치하는 컬럼만 추출.
- 각 셀 값을 필드 타입별로 변환 후, 행마다 `schema.safeParse` 로 검증. 실패하면 그 행에서 throw(부분 반영 없음).
- 모든 필드가 null/`""` 인 행은 skip.
- 데이터가 한 건도 없으면 기대 헤더 목록을 담은 메시지로 throw.
- 내부에서 워크북을 열고 `finally` 로 `close()` 하므로 호출자 정리 불필요.

### 값 변환 규칙

- 빈값(null/`""`) → 스키마 기본값: `ZodDefault` 면 그 기본값, optional/nullable 이면 `undefined`, 필수 boolean 이면 `false`, 그 외 `undefined`.
- `ZodString` → 문자열(아니면 `String()` 캐스팅).
- `ZodNumber` → number(문자열은 `num.parseFloat`).
- `ZodBoolean` → `"1"`/`"true"` → `true`, `"0"`/`"false"` → `false`, 그 외 `Boolean()`.
- `DateOnly`/`DateTime`/`Time` 인스턴스는 그대로 통과.

## write 동작

- 0행에 헤더(제외 후 필드 순서), 1행부터 레코드 값 기록.
- 전 셀에 4변 테두리 적용.
- **필수**(optional/nullable/default 아님)이며 boolean 이 아닌 필드의 헤더 셀은 노란색(`00FFFF00`) 강조.
- zoom 85%, 0행 틀고정 적용.
- 반환된 `ExcelWorkbook` 의 리소스 관리는 **호출자 책임** — 사용 후 `close()` 필수. write 중 예외 발생 시 내부에서 close 후 rethrow.

## 사용 예

```typescript
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("이름"),
  age: z.number().optional().describe("나이"),
});
const wrapper = new ExcelWrapper(schema);

// 읽기 ("이름"/"나이" 헤더를 0번 시트에서 매칭)
const rows = await wrapper.read(bytes);

// 쓰기 (호출자가 close 책임)
const wb = await wrapper.write("회원", [{ name: "홍길동", age: 30 }]);
try {
  const out = await wb.toBytes();
} finally {
  await wb.close();
}
```

## 주의사항

- `.describe()` 표시명이 실제 Excel 헤더와 일치해야 `read` 가 컬럼을 인식. 일치 헤더가 전혀 없으면 데이터 0건으로 throw.
- 표시명 미지정 필드는 필드 키 그대로 헤더로 쓰이므로, 한글 헤더가 필요하면 반드시 `.describe()` 지정.
- `read` 행 검증은 전부-성공 전제: 한 행이라도 `safeParse` 실패 시 전체 throw.
- `write` 반환 워크북 미`close` 시 리소스 누수.
