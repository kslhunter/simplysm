# @simplysm/excel — ExcelCell / ExcelRow / ExcelCol

개별 셀의 값·수식·병합·스타일을 읽고 쓰거나, 행/열 단위로 셀을 순회할 때 함께 읽는 묶음. 모든 셀 I/O 가 `async` 인 이유는 셀 타입별로 필요한 XML 파트(SharedStrings/Styles)만 lazy-load 하기 때문이다. 인스턴스는 `ws.cell(r,c)` / `ws.row(r)` / `ws.col(c)` 로 얻으며 좌표는 모두 0 기반.

## ExcelCell

```typescript
readonly addr: ExcelAddressPoint   // { r, c } 0 기반
```

### 값/수식

- `setValue(val: ExcelValueType): Promise<void>` — 셀 값 설정. `val` 타입별 분기: string → SharedString 으로 등록, boolean → `"1"/"0"`, number → 숫자 셀, `DateOnly`/`DateTime`/`Time` → Excel 날짜 시리얼 + 해당 numFmt 스타일 자동 적용, `undefined`/`null` → 셀 삭제. 그 외 타입은 throw.
- `getValue(): Promise<ExcelValueType>` — 셀 값 반환. 빈 셀이면 `undefined`. 셀 타입·numFmt 를 보고 string/boolean/number/`DateOnly`/`DateTime`/`Time` 로 복원. 셀 타입이 `"e"`(에러)면 throw.
- `setFormula(val: string | undefined): Promise<void>` — 수식 설정. `undefined` 면 셀 삭제. 설정 시 셀 타입은 `str` 로.
- `getFormula(): Promise<string | undefined>` — 셀 수식 반환(없으면 `undefined`).

### 병합

- `merge(r, c): Promise<void>` — 현재 셀을 시작점으로 끝 좌표 `(r, c)`(0 기반)까지 병합. 예: A1 에서 `merge(2, 2)` → A1:C3.

### 스타일

- `setStyle(opts: ExcelStyleOptions): Promise<void>` — 배경·테두리·정렬·숫자형식·폰트 적용. 기존 스타일이 있으면 clone 후 병합. 자세히: [style.md](./style.md).
- `getStyleId(): Promise<string | undefined>` — 셀의 스타일 ID(없으면 `undefined`).
- `setStyleId(styleId: string | undefined): Promise<void>` — 스타일 ID 를 직접 지정/해제. 이미 만들어진 스타일을 재사용할 때.

### 사용 예

```typescript
await ws.cell(0, 0).setValue("이름");
await ws.cell(1, 0).setValue(new DateOnly(2026, 6, 1)); // 날짜 numFmt 자동
await ws.cell(0, 0).merge(0, 2);                        // A1:C1 병합
const v = await ws.cell(1, 0).getValue();               // DateOnly 인스턴스
```

## ExcelRow

```typescript
cell(c: number): ExcelCell           // 이 행의 c열 셀(0 기반)
getCells(): Promise<ExcelCell[]>     // 데이터 범위 폭만큼 셀 배열(인덱스=열)
```

- `getCells` 는 시트 데이터 범위의 시작~끝 열까지 셀을 채우며, 배열 인덱스가 열 번호와 일치(앞쪽 빈 열은 sparse).

## ExcelCol

```typescript
cell(r: number): ExcelCell           // 이 열의 r행 셀(0 기반)
getCells(): Promise<ExcelCell[]>     // 데이터 범위 높이만큼 셀 배열(인덱스=행)
setWidth(size: number): Promise<void> // 열 너비 설정
```

- `setWidth` 의 `size` — Excel 열 너비 단위(문자 폭 기준). 컬럼 폭을 데이터에 맞게 넓힐 때.
