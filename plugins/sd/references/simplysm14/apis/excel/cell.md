# @simplysm/excel — ExcelCell / ExcelRow / ExcelCol

개별 셀의 값·수식·병합·스타일을 읽고 쓰거나, 행/열 단위로 셀을 순회하고 열 너비를 줄 때 함께 읽는 묶음. 핸들은 `ws.cell(r,c)` / `ws.row(r)` / `ws.col(c)` 로 얻으며(모두 0 기반, 동기 반환·인스턴스 캐시), 실제 I/O 는 셀의 `async` 메서드에서 일어난다.

## ExcelCell

`ws.cell(r, c)` 가 반환. 셀 타입에 필요한 XML(SharedStrings/Styles)만 그때그때 로드하므로 모든 메서드가 `async`.

- `readonly addr: ExcelAddressPoint` — 셀 0 기반 `{r,c}` 좌표.

### 값·수식

- `getValue(): Promise<ExcelValueType>` — 셀 값 반환. 셀 타입·numFmt 를 보고 `string`/`boolean`/`number`/`DateOnly`/`DateTime`/`Time` 로 자동 변환. 빈 셀은 `undefined`. 에러 셀(`t="e"`)은 throw.
- `setValue(val: ExcelValueType): Promise<void>` — 셀 값 설정. `string` → SharedString, `boolean` → `b`, `number` → 숫자, `DateOnly`/`DateTime`/`Time` → 시리얼 숫자 + 날짜 numFmt 자동 부여. `undefined` → 셀 삭제. 그 외 타입은 throw.
- `getFormula(): Promise<string | undefined>` — 셀 수식 문자열 반환.
- `setFormula(val: string | undefined): Promise<void>` — 셀 수식 설정. `undefined` 면 셀 삭제(수식 제거).

### 병합

- `merge(r: number, c: number): Promise<void>` — 현재 셀을 좌상단으로 끝 좌표 `(r,c)`(0 기반, inclusive)까지 병합.

### 스타일

- `getStyleId(): Promise<string | undefined>` — 셀 스타일 ID 반환.
- `setStyleId(styleId: string | undefined): Promise<void>` — 셀 스타일 ID 직접 설정(다른 셀에서 얻은 ID 재사용 등).
- `setStyle(opts: ExcelStyleOptions): Promise<void>` — 셀 스타일 설정. 기존 셀 스타일을 clone 후 지정 필드만 병합(부분 갱신). 옵션 상세는 [style.md](./style.md).

### 사용 예

```typescript
await ws.cell(0, 0).setValue("이름");
await ws.cell(1, 0).setValue(new DateOnly(2024, 6, 15)); // 날짜 numFmt 자동
await ws.cell(0, 0).merge(0, 2); // A1:C1 병합
```

## ExcelRow

`ws.row(r)` 가 반환. 한 행의 셀 접근.

- `cell(c: number): ExcelCell` — 이 행의 0 기반 열 셀.
- `getCells(): Promise<ExcelCell[]>` — 시트 데이터 범위 열 폭만큼 셀 배열(열 인덱스 위치에 채움).

## ExcelCol

`ws.col(c)` 가 반환. 한 열의 셀 접근 및 너비.

- `cell(r: number): ExcelCell` — 이 열의 0 기반 행 셀.
- `getCells(): Promise<ExcelCell[]>` — 시트 데이터 범위 행 높이만큼 셀 배열.
- `setWidth(size: number): Promise<void>` — 열 너비 설정.

```typescript
await ws.col(2).setWidth(20);
for (const cell of await ws.row(0).getCells()) {
  // 헤더 셀 순회
}
```

## 주의사항

- 좌표·인덱스는 모두 0 기반. `cell(0,0)` = A1.
- `getValue` 의 결측은 `undefined` 로 보존된다(빈 셀과 "값 없음" 을 같은 것으로 다룸).
- 날짜 값은 `setValue` 에 `DateOnly`/`DateTime`/`Time` 인스턴스를 직접 넣으면 numFmt 가 자동 부여되므로, 별도 `setStyle({ numberFormat })` 가 보통 불필요하다.
