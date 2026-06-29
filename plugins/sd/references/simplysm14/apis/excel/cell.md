# @simplysm/excel — ExcelCell / ExcelRow / ExcelCol

`ExcelWorksheet.cell`/`row`/`col` 로 얻는 셀·행·열 핸들 묶음. 핸들 생성은 동기지만 실제 값·스타일·워크시트 XML 접근은 `async` 메서드에서 lazy-load 된다.

## ExcelCell

```typescript
class ExcelCell {
  readonly addr: ExcelAddressPoint;
  setFormula(val: string | undefined): Promise<void>;
  getFormula(): Promise<string | undefined>;
  setValue(val: ExcelValueType): Promise<void>;
  getValue(): Promise<ExcelValueType>;
  merge(r: number, c: number): Promise<void>;
  getStyleId(): Promise<string | undefined>;
  setStyleId(styleId: string | undefined): Promise<void>;
  setStyle(opts: ExcelStyleOptions): Promise<void>;
}
```

- `addr` — 셀의 0 기반 `{ r, c }` 좌표.
- `val: string` — `setFormula` 에서는 worksheet formula(`f`) 로 저장하고 셀 타입을 `"str"` 로 둔다.
- `val: undefined` — `setFormula` 에서는 셀을 삭제하고, `setValue` 에서도 셀을 삭제한다.
- `val: number` — 셀 타입을 비우고 숫자 문자열을 셀 값으로 저장한다.
- `val: boolean` — 셀 타입 `"b"` 와 `"1"`/`"0"` 값으로 저장한다.
- `val: DateOnly` — Excel 날짜 serial 숫자를 저장하고 `DateOnly` 숫자 형식 style 을 적용한다.
- `val: DateTime` — Excel 날짜/시간 serial 숫자를 저장하고 `DateTime` 숫자 형식 style 을 적용한다.
- `val: Time` — Excel 시간 serial 숫자를 저장하고 `Time` 숫자 형식 style 을 적용한다.
- `r` — 병합 끝 행 인덱스. 현재 셀 주소가 병합 시작 좌표다.
- `c` — 병합 끝 열 인덱스. 현재 셀 주소가 병합 시작 좌표다.
- `styleId` — worksheet 셀 속성 `s` 값. `undefined` 를 지정하면 styleId 속성을 제거한다.
- `opts` — 셀 스타일 옵션. 기존 styleId 가 있으면 기존 스타일을 clone 한 뒤 지정 옵션만 반영한 새 styleId 를 셀에 적용한다.

메서드 동작:

- `setFormula(val)` — 수식을 쓰면 기존 셀 값을 비우고 formula 만 지정한다. `undefined` 는 셀 삭제다.
- `getFormula()` — worksheet 셀의 formula 문자열을 반환한다. 없으면 `undefined`.
- `setValue(val)` — 지원 타입별로 셀 타입·값·스타일을 갱신한다. 지원하지 않는 객체/배열 등은 throw 한다.
- `getValue()` — 셀 타입과 숫자 형식으로 값을 복원한다. shared string ID 파싱 실패, 에러 셀 타입, 날짜 숫자 파싱 실패, 알 수 없는 숫자 형식은 throw 한다.
- `merge(r,c)` — 현재 셀부터 끝 좌표까지 병합을 추가한다. 기존 병합 범위와 겹치면 throw 하고, 시작 셀 외 병합 범위 안 셀은 삭제된다.
- `getStyleId()` — 현재 셀의 styleId 를 반환한다.
- `setStyleId(styleId)` — 현재 셀의 styleId 를 직접 지정하거나 제거한다.
- `setStyle(opts)` — `ExcelStyleOptions` 를 내부 스타일로 변환하고 스타일 파트를 생성·갱신한다. 옵션 상세는 [style.md](./style.md).

## ExcelRow

```typescript
class ExcelRow {
  cell(c: number): ExcelCell;
  getCells(): Promise<ExcelCell[]>;
}
```

- `c` — 0 기반 열 인덱스. 행의 특정 열 셀 핸들을 얻을 때 사용한다.

메서드 동작:

- `cell(c)` — 같은 worksheet 의 `(row.r, c)` 셀 핸들을 반환한다.
- `getCells()` — worksheet 데이터 범위의 시작 열부터 끝 열까지 셀 핸들을 배열 인덱스 `c` 위치에 채워 반환한다.

## ExcelCol

```typescript
class ExcelCol {
  cell(r: number): ExcelCell;
  getCells(): Promise<ExcelCell[]>;
  setWidth(size: number): Promise<void>;
}
```

- `r` — 0 기반 행 인덱스. 열의 특정 행 셀 핸들을 얻을 때 사용한다.
- `size` — 열 너비 숫자. worksheet `col.width` 문자열로 저장되고 `bestFit="1"`, `customWidth="1"` 이 함께 설정된다.

메서드 동작:

- `cell(r)` — 같은 worksheet 의 `(r, col.c)` 셀 핸들을 반환한다.
- `getCells()` — worksheet 데이터 범위의 시작 행부터 끝 행까지 셀 핸들을 배열 인덱스 `r` 위치에 채워 반환한다.
- `setWidth(size)` — 현재 열의 1 기반 열 인덱스에 너비를 지정한다. 기존 다중 열 범위가 대상 열을 포함하면 범위를 분할해 대상 열만 새 너비로 바꾼다.