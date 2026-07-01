# @simplysm/excel

Excel 워크북을 `xlsx`/`xlsb` ZIP 파트 단위로 lazy-load 하며 읽고 쓰는 중립 패키지. `ExcelWorkbook` 에서 워크북·시트·셀 조작을 시작하고, `ExcelWrapper` 로 Zod 스키마 기반 레코드 변환을 수행하며, `ExcelUtils` 로 주소·날짜 serial·숫자 형식 변환을 보조한다.

## 사용 트리거 인덱스

- **ExcelWorkbook / ExcelWorksheet / ExcelRow / ExcelCol** — 워크북을 열거나 생성하고 시트 추가·조회·이름 변경·데이터 표·행 복사·보기·이미지·내보내기, 행/열 핸들을 다룰 때. 자세히: [workbook-worksheet.md](./workbook-worksheet.md)
- **ExcelCell** — 개별 셀의 값·수식·병합·스타일을 읽고 쓸 때. 자세히: [cell.md](./cell.md)
- **셀 스타일 타입** (`ExcelStyleOptions`/`ExcelFont`/정렬·테두리·밑줄 literal) — `setStyle`/`setDefaultStyle` 의 배경·테두리·정렬·숫자 형식·폰트 옵션을 해석할 때. 자세히: [style.md](./style.md)
- **조건부 서식 타입** (`ExcelConditionalRule`/`ExcelConditionalRuleStyle`) — `addConditionalFormat` 으로 값 비교·텍스트 매칭·수식 기반 조건부 서식을 추가할 때. 자세히: [conditional-format.md](./conditional-format.md)
- **ExcelWrapper** — Zod 스키마의 필드 설명을 Excel 헤더로 삼아 레코드 배열을 읽고 쓰며 검증할 때. 자세히: [wrapper.md](./wrapper.md)
- **ExcelUtils** — A1 주소와 0 기반 좌표 변환, Excel 날짜 serial 변환, 숫자 형식 코드/ID/이름 변환이 필요할 때. 자세히: [utils.md](./utils.md)
- **값/주소 공통 타입** (`ExcelValueType`/`ExcelNumberFormat`/`ExcelCellType`/`ExcelAddressPoint`/`ExcelAddressRangePoint`/`ExcelXml`) — 셀 값 유니온·주소 좌표·셀 타입을 시그니처에서 만날 때. 아래 인라인 섹션.
- **OOXML XML-shape 타입** (`ExcelXml*Data` / `Excel*Data`) — 직렬화 구조 타입을 해석할 때. 자세히: [xml-types.md](./xml-types.md)

화면(`sd-crud-list`/`sd-crud-detail`)에서 `ExcelWrapper` 로 검색 결과를 엑셀로 내려받거나 업로드로 일괄 등록하는 사용 흐름은 [../../manuals/client-crud.md](../../manuals/client-crud.md) 참조.

## 값/주소 공통 타입

### ExcelValueType

```typescript
type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
```

셀 읽기/쓰기에서 오가는 값 유니온. `ExcelCell.getValue`/`setValue`, `ExcelWorksheet.setDataMatrix`/`setRecords` 가 이 타입을 쓴다.

- `number` — 셀에 숫자 문자열로 저장하고, 숫자 형식 판별 결과가 `number`/`"n"` 일 때 `getValue()` 가 `parseFloat` 로 반환하는 값.
- `string` — 공유 문자열(`t="s"`) 또는 문자열 수식 결과(`t="str"`)/inline 문자열(`t="inlineStr"`)로 읽고 쓰는 값.
- `DateOnly` — 쓰기 시 Excel 날짜 serial 숫자로 저장하고 `DateOnly` 숫자 형식(numFmtId 14)을 함께 적용하는 값.
- `DateTime` — 쓰기 시 Excel 날짜+시간 serial 숫자로 저장하고 `DateTime` 숫자 형식(numFmtId 22)을 함께 적용하는 값.
- `Time` — 쓰기 시 Excel 시간 serial 숫자로 저장하고 `Time` 숫자 형식(numFmtId 18)을 함께 적용하는 값.
- `boolean` — 셀 타입 `b` 와 값 `"1"`/`"0"` 으로 저장하고, 읽을 때 `"1"` 을 `true` 로 복원하는 값.
- `undefined` — 읽기에서는 빈 셀, 쓰기에서는 셀 삭제를 의미한다.

### ExcelNumberFormat

```typescript
type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

`ExcelStyleOptions.numberFormat` 프리셋이자 `ExcelUtils` 숫자 형식 변환의 결과/입력 literal.

- `"number"` — 이름→ID 변환 시 numFmtId `0`(일반 숫자).
- `"string"` — 이름→ID 변환 시 numFmtId `49`(텍스트).
- `"DateOnly"` — 이름→ID 변환 시 numFmtId `14`(날짜).
- `"DateTime"` — 이름→ID 변환 시 numFmtId `22`(날짜+시간).
- `"Time"` — 이름→ID 변환 시 numFmtId `18`(시간).

### ExcelCellType

```typescript
type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";
```

OOXML 셀 `t` 속성 값. `getValue()` 가 이 타입으로 값 복원 방식을 분기한다.

- `"s"` — shared string ID 를 값으로 저장하는 셀.
- `"b"` — `"1"`/`"0"` 을 boolean 으로 읽는 셀.
- `"str"` — 수식 결과 문자열을 그대로 읽는 셀.
- `"n"` — 값을 `parseFloat` 로 읽는 숫자 셀.
- `"inlineStr"` — inline string 텍스트를 문자열로 읽는 셀.
- `"e"` — 에러 값이 들어 있는 셀이며 `getValue()` 가 throw 한다.

### ExcelAddressPoint / ExcelAddressRangePoint

```typescript
interface ExcelAddressPoint {
  r: number;
  c: number;
}
interface ExcelAddressRangePoint {
  s: ExcelAddressPoint;
  e: ExcelAddressPoint;
}
```

- `r` — 0 기반 행 인덱스. A1 주소 행 숫자와는 `±1` 로 변환된다.
- `c` — 0 기반 열 인덱스. A1 주소 열 문자와는 `0 = A` 기준으로 변환된다.
- `s` — 범위 시작 좌표(좌상단).
- `e` — 범위 끝 좌표(우하단). 시작과 같으면 범위 문자열은 단일 주소가 된다.

### ExcelXml

```typescript
interface ExcelXml {
  readonly data: unknown;
  cleanup(): void;
}
```

- `data` — XML 모델의 원본 구조 트리(읽기 전용).
- `cleanup()` — 직렬화 전 정리용 메서드 계약.
