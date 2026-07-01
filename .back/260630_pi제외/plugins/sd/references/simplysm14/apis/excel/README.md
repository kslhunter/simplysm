# @simplysm/excel

Excel 워크북을 `xlsx`/`xlsb` ZIP 파트 단위로 lazy-load 하며 읽고 쓰는 중립 패키지. `ExcelWorkbook` 에서 워크북·시트·셀 조작을 시작하고, `ExcelWrapper` 로 Zod 스키마 기반 레코드 변환을 수행하며, `ExcelUtils` 로 주소·날짜 serial·숫자 형식 변환을 보조한다.

## 사용 트리거 인덱스

- **ExcelWorkbook / ExcelWorksheet** — 워크북을 열거나 생성하고 시트 추가·조회·이름 변경·데이터 표·행 복사·보기·이미지·내보내기를 다룰 때. 자세히: [workbook-worksheet.md](./workbook-worksheet.md)
- **ExcelCell / ExcelRow / ExcelCol** — 개별 셀 값·수식·병합·스타일, 행/열 셀 순회, 열 너비를 다룰 때. 자세히: [cell.md](./cell.md)
- **셀 스타일 타입** — `setStyle`/`setDefaultStyle` 의 배경·테두리·정렬·숫자 형식·폰트 옵션을 해석할 때. 자세히: [style.md](./style.md)
- **조건부 서식 타입** — `addConditionalFormat` 으로 값 비교·텍스트 매칭·수식 기반 조건부 서식을 추가할 때. 자세히: [conditional-format.md](./conditional-format.md)
- **ExcelWrapper** — Zod 스키마의 필드 설명을 Excel 헤더로 삼아 레코드 배열을 읽고 쓰며 검증할 때. 자세히: [wrapper.md](./wrapper.md)
- **ExcelUtils** — A1 주소와 0 기반 좌표 변환, Excel 날짜 serial 변환, 숫자 형식 코드/ID/이름 변환이 필요할 때. 자세히: [utils.md](./utils.md)
- **값/주소 공통 타입** — 셀 값 유니온, 주소 좌표, 셀 타입, `ExcelXml` 정리 계약을 시그니처에서 만날 때. 아래 인라인 섹션.
- **OOXML XML-shape 타입** — `ExcelXml*Data` / `Excel*Data` 류의 직렬화 구조 타입을 해석할 때. 자세히: [xml-types.md](./xml-types.md)

## 값/주소 공통 타입

### ExcelValueType

```typescript
type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
```

- `number` — 셀에 숫자 문자열로 저장되고, 숫자/날짜 형식 판별 결과가 `number` 일 때 `getValue()` 가 반환하는 값.
- `string` — 공유 문자열(`t="s"`) 또는 문자열 수식 결과(`t="str"`)로 읽고 쓰는 값.
- `DateOnly` — 셀에는 Excel 날짜 serial 숫자로 쓰고 `DateOnly` 숫자 형식 ID를 함께 적용하는 값.
- `DateTime` — 셀에는 Excel 날짜/시간 serial 숫자로 쓰고 `DateTime` 숫자 형식 ID를 함께 적용하는 값.
- `Time` — 셀에는 Excel 시간 serial 숫자로 쓰고 `Time` 숫자 형식 ID를 함께 적용하는 값.
- `boolean` — 셀 타입 `b` 와 값 `"1"`/`"0"` 으로 저장하고 읽을 때 true/false 로 복원하는 값.
- `undefined` — 읽기에서는 빈 셀 값, 쓰기에서는 셀 삭제를 의미한다.

### ExcelNumberFormat

```typescript
type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

- `"number"` — 내장 numFmtId `0` 으로 변환되는 일반 숫자 형식.
- `"string"` — 내장 numFmtId `49` 로 변환되는 텍스트 형식.
- `"DateOnly"` — 내장 numFmtId `14` 로 변환되고 `getValue()` 에서 `DateOnly` 복원에 쓰이는 날짜 형식.
- `"DateTime"` — 내장 numFmtId `22` 로 변환되고 `getValue()` 에서 `DateTime` 복원에 쓰이는 날짜+시간 형식.
- `"Time"` — 내장 numFmtId `18` 로 변환되고 `getValue()` 에서 `Time` 복원에 쓰이는 시간 형식.

### ExcelCellType

```typescript
type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";
```

- `"s"` — shared string ID를 값으로 저장하는 셀 타입.
- `"b"` — `"1"`/`"0"` 값을 boolean 으로 읽는 셀 타입.
- `"str"` — 수식 결과 문자열 값을 그대로 읽는 셀 타입.
- `"n"` — 값을 `parseFloat` 로 읽는 숫자 셀 타입.
- `"inlineStr"` — inline string 텍스트를 문자열로 읽는 셀 타입.
- `"e"` — 에러 값이 들어 있는 셀 타입이며 `getValue()` 가 throw 한다.

### ExcelAddressPoint / ExcelAddressRangePoint

```typescript
interface ExcelAddressPoint { r: number; c: number }
interface ExcelAddressRangePoint { s: ExcelAddressPoint; e: ExcelAddressPoint }
```

- `r` — 0 기반 행 인덱스. A1 주소의 행 숫자와 변환할 때 `+1`/`-1` 된다.
- `c` — 0 기반 열 인덱스. A1 주소의 열 문자와 변환할 때 `0 = A` 기준으로 계산된다.
- `s` — 범위 시작 좌표. `stringifyRangeAddr` 의 왼쪽 주소가 된다.
- `e` — 범위 끝 좌표. 시작과 같으면 범위 문자열은 단일 주소가 된다.

### ExcelXml

```typescript
interface ExcelXml {
  readonly data: unknown;
  cleanup(): void;
}
```

- `data` — XML 모델의 원본 구조 트리.
- `cleanup()` — 직렬화 전 정리용 메서드 계약.