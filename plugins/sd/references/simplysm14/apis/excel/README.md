# @simplysm/excel

XLSX/XLSB 워크북을 ZIP 파트 단위로 lazy-load 하며 읽고 쓰는 중립 패키지. 워크북·시트·행·열·셀 단위 조작, 셀 스타일·조건부 서식, Zod 스키마 기반 레코드 변환, 주소·날짜·숫자 형식 변환을 수행함.

## 사용 트리거 인덱스

- **ExcelWorkbook / ExcelWorksheet / ExcelRow / ExcelCol** — 워크북을 생성하거나 기존 파일을 열어 시트 추가·조회·이름 변경, 시트 단위 데이터 표 읽기·쓰기·복사·보기 설정·이미지 삽입, 행/열 핸들 접근을 다룰 때. 자세히: [workbook-worksheet.md](./workbook-worksheet.md)
- **ExcelCell** — 개별 셀의 값·수식·병합·스타일을 읽고 쓸 때. 자세히: [cell.md](./cell.md)
- **셀 스타일** (`ExcelStyleOptions` / `ExcelFont` / 정렬·테두리 literal) — 셀·워크북의 배경·테두리·정렬·숫자 형식·폰트 스타일을 설정할 때. 자세히: [style.md](./style.md)
- **조건부 서식** (`ExcelConditionalRule`) — 셀 범위에 값 비교·텍스트 매칭·수식 기반 조건부 서식을 추가할 때. 자세히: [conditional-format.md](./conditional-format.md)
- **ExcelWrapper** — Zod 스키마 정의로 Excel 파일을 타입 안전하게 읽고 쓰며 유효성 검사를 수행할 때. 자세히: [wrapper.md](./wrapper.md)
- **ExcelUtils** — A1 주소와 0 기반 좌표 변환, Excel 날짜 serial 변환, 숫자 형식 코드/ID/이름 변환을 수행할 때. 자세히: [utils.md](./utils.md)
- **값·주소 공통 타입** (`ExcelValueType` / `ExcelNumberFormat` / `ExcelCellType` / `ExcelAddressPoint` / `ExcelAddressRangePoint`) — 셀 값 유니온·숫자 형식 literal·셀 타입을 다룰 때 아래 참조.
- **OOXML XML-shape 타입** (`ExcelXml*Data`) — ZIP 내 XML 직렬화 구조를 해석할 때. 자세히: [xml-types.md](./xml-types.md)

화면 목록 데이터를 Excel로 내려받거나 업로드로 일괄 등록하는 사용 흐름은 [../../manuals/client-crud.md](../../manuals/client-crud.md) 참조.

## 값·주소·셀 타입

### ExcelValueType

```typescript
type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
```

셀 읽기/쓰기에서 오가는 값 유니온. `ExcelCell.getValue()` / `setValue()`, `ExcelWorksheet.setDataMatrix()` / `setRecords()` 가 사용.

- `number` — 셀에 숫자 문자열로 저장. `getValue()` 가 숫자 형식 판별 결과가 `number` / `"n"` 일 때 `parseFloat()` 로 반환.
- `string` — 공유 문자열(`t="s"`) 또는 문자열 수식 결과(`t="str"`) / inline 문자열(`t="inlineStr"`) 로 읽고 쓰는 값.
- `DateOnly` — `getValue()` 가 `DateOnly` 숫자 형식(numFmtId 14) 셀을 `DateOnly` 인스턴스로 복원. `setValue()` 시 Excel 날짜 serial 숫자 + 형식 자동 적용.
- `DateTime` — `getValue()` 가 `DateTime` 숫자 형식(numFmtId 22) 셀을 `DateTime` 인스턴스로 복원. `setValue()` 시 Excel 날짜+시간 serial 숫자 + 형식 자동 적용.
- `Time` — `getValue()` 가 `Time` 숫자 형식(numFmtId 18) 셀을 `Time` 인스턴스로 복원. `setValue()` 시 Excel 시간 serial 숫자 + 형식 자동 적용.
- `boolean` — 셀 타입 `b` 와 값 `"1"` / `"0"` 으로 저장. `getValue()` 가 `"1"` 을 `true` 로 복원.
- `undefined` — `getValue()` 에서 빈 셀 반환. `setValue(undefined)` 로 셀 삭제.

### ExcelNumberFormat

```typescript
type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

`ExcelStyleOptions.numberFormat` 프리셋이자 `ExcelUtils` 숫자 형식 변환의 결과/입력 literal.

- `"number"` — 이름→ID 변환 시 numFmtId `0` (일반 숫자).
- `"string"` — 이름→ID 변환 시 numFmtId `49` (텍스트).
- `"DateOnly"` — 이름→ID 변환 시 numFmtId `14` (날짜).
- `"DateTime"` — 이름→ID 변환 시 numFmtId `22` (날짜+시간).
- `"Time"` — 이름→ID 변환 시 numFmtId `18` (시간).

### ExcelCellType

```typescript
type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";
```

OOXML 셀 `t` 속성 값. `ExcelCell.getValue()` 가 이 타입으로 값 복원 방식 분기.

- `"s"` — shared string ID 를 값으로 저장하는 셀. `getValue()` 가 ID로 SharedStrings.xml 조회 후 문자열 반환.
- `"b"` — boolean 셀. `getValue()` 가 값 `"1"` / `"0"` 을 true / false 로 반환.
- `"str"` — 수식 결과 문자열 셀. `getValue()` 가 저장된 문자열 값 그대로 반환.
- `"n"` — 숫자 셀. `getValue()` 가 `parseFloat()` 로 값 반환.
- `"inlineStr"` — inline string 셀. `getValue()` 가 저장된 텍스트 그대로 반환.
- `"e"` — 에러 값 셀. `getValue()` 가 에러 메시지로 throw.

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

- `r` — 0 기반 행 인덱스. A1 주소 행 숫자와는 `r + 1` 로 변환.
- `c` — 0 기반 열 인덱스. A1 주소 열 문자와는 `0 = 'A'` 기준으로 변환.
- `s` — 범위 시작 좌표(좌상단).
- `e` — 범위 끝 좌표(우하단). 시작과 같으면 범위 문자열은 단일 주소 반환.

### ExcelXml

```typescript
interface ExcelXml {
  readonly data: unknown;
  cleanup(): void;
}
```

- `data` — XML 모델의 원본 구조 트리(읽기 전용). 파싱된 OOXML 또는 BIFF12 이진 파트.
- `cleanup()` — 직렬화 전 정리용 메서드. 내부 캐시 초기화 역할.
