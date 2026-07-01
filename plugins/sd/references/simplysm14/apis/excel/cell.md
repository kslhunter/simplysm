# @simplysm/excel — ExcelCell / ExcelRow / ExcelCol

`ExcelWorksheet.cell`/`row`/`col` 로 얻는 셀·행·열 핸들 묶음. 핸들 생성은 동기지만 실제 값·스타일·워크시트 XML 접근은 `async` 메서드에서 lazy-load 된다(셀 타입에 필요한 파트만 선택 로드).

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
- `setFormula` 의 `val: string` — worksheet formula(`f`)로 저장하고 기존 값(`v`)을 비우며 셀 타입을 `"str"` 로 둔다.
- `setFormula`/`setValue` 의 `val: undefined` — 셀을 삭제한다.
- `setValue` 의 `val: string` — shared string 으로 등록(있으면 ID 재사용)하고 셀 타입 `"s"` 로 저장한다.
- `setValue` 의 `val: number` — 셀 타입을 비우고(`null`) 숫자 문자열을 셀 값으로 저장한다.
- `setValue` 의 `val: boolean` — 셀 타입 `"b"` 와 `"1"`/`"0"` 값으로 저장한다.
- `setValue` 의 `val: DateOnly | DateTime | Time` — Excel serial 숫자를 저장하고 각 타입의 숫자 형식 style(numFmtId 14/22/18)을 함께 적용한다.
- `merge` 의 `r` / `c` — 병합 끝 행/열 인덱스. 현재 셀 주소가 병합 시작 좌표다.
- `setStyleId` 의 `styleId` — worksheet 셀 속성 `s` 값. `undefined` 면 styleId 속성을 제거한다.
- `setStyle` 의 `opts` — 셀 스타일 옵션(자세히는 [style.md](./style.md)). 기존 styleId 가 있으면 기존 스타일을 clone 한 뒤 지정 옵션만 반영한 새 styleId 를 적용한다.

메서드 동작:

- `setFormula(val)` — 수식을 쓰면 기존 셀 값을 비우고 formula 만 지정한다. `undefined` 는 셀 삭제.
- `getFormula()` — worksheet 셀의 formula 문자열을 반환한다. 없으면 `undefined`.
- `setValue(val)` — 타입별로 셀 타입·값·스타일을 갱신한다. 지원하지 않는 객체/배열 등은 throw 한다.
- `getValue()` — 셀 타입(`t`)과, 타입이 없으면 셀 styleId 의 숫자 형식으로 값을 복원한다. shared string ID 파싱 실패, 에러 셀(`"e"`), 날짜 숫자 파싱 실패, 알 수 없는 숫자 형식은 throw 한다.
- `merge(r,c)` — 현재 셀부터 끝 좌표까지 병합을 추가한다.
- `getStyleId()` / `setStyleId(styleId)` — 현재 셀의 styleId 를 읽거나 직접 지정/제거한다.
- `setStyle(opts)` — `ExcelStyleOptions` 를 내부 스타일로 변환하고 styles 파트를 생성·갱신한다(기존 styleId 는 clone 후 일부만 덮어씀).

## ExcelRow

```typescript
class ExcelRow {
  cell(c: number): ExcelCell;
  getCells(): Promise<ExcelCell[]>;
}
```

- `cell` 의 `c` — 0 기반 열 인덱스. 행의 특정 열 셀 핸들을 얻는다.

메서드 동작:

- `cell(c)` — 같은 worksheet 의 `(row.r, c)` 셀 핸들을 반환한다.
- `getCells()` — worksheet 데이터 범위의 시작 열~끝 열 셀 핸들을 배열 인덱스 `c` 위치에 채워 반환한다.

## ExcelCol

```typescript
class ExcelCol {
  cell(r: number): ExcelCell;
  getCells(): Promise<ExcelCell[]>;
  setWidth(size: number): Promise<void>;
}
```

- `cell` 의 `r` — 0 기반 행 인덱스. 열의 특정 행 셀 핸들을 얻는다.
- `setWidth` 의 `size` — 열 너비. 현재 열의 1 기반 인덱스에 너비 문자열로 저장된다.

메서드 동작:

- `cell(r)` — 같은 worksheet 의 `(r, col.c)` 셀 핸들을 반환한다.
- `getCells()` — worksheet 데이터 범위의 시작 행~끝 행 셀 핸들을 배열 인덱스 `r` 위치에 채워 반환한다.
- `setWidth(size)` — 현재 열(0 기반 `c` → 1 기반 colIndex)에 너비를 설정한다.
