# @simplysm/excel — ExcelCell / ExcelRow / ExcelCol

개별 셀의 값·수식·병합·스타일을 읽고 쓰거나, 행/열 단위로 셀을 순회하고 열 너비를 줄 때 함께 읽는 묶음. 셀 객체는 `ws.cell(r,c)` / `ws.row(r)` / `ws.col(c)` 로 얻으며(모두 0 기반, 동기 반환·인스턴스 캐시), 실제 I/O 는 셀의 `async` 메서드에서 일어난다.

## ExcelCell

`ws.cell(r, c)` 또는 `row.cell(c)` / `col.cell(r)` 로 얻는다.

- `readonly addr: ExcelAddressPoint` — 이 셀의 0 기반 좌표 `{ r, c }`. 병합·복사 인자로 재사용.

값/수식:

- `getValue(): Promise<ExcelValueType>` — 셀 값을 타입 추론해 반환. SharedString→string, `b`→boolean, 숫자형 numFmt→number, 날짜/시간 numFmt→`DateOnly`/`DateTime`/`Time`, 빈 셀→`undefined`. 셀 타입이 `e`(에러)이거나 시리얼 파싱 실패면 throw. 날짜 판별은 셀 스타일의 numFmtCode/numFmtId 를 본다.
- `setValue(val: ExcelValueType): Promise<void>` — 값 쓰기. `string`→SharedString 등록 후 `s` 타입, `boolean`→`b` 타입(`"1"`/`"0"`), `number`→숫자, `DateOnly`/`DateTime`/`Time`→시리얼 숫자 + 해당 날짜 numFmt 자동 부여, `undefined`/`null`→셀 삭제. 그 외 타입은 throw. 날짜형 화면이면 문자열 변환 없이 날짜 객체를 그대로 넘겨 자동 서식을 받는 게 단순.
- `getFormula(): Promise<string | undefined>` — 셀 수식 문자열 반환(없으면 `undefined`).
- `setFormula(val: string | undefined): Promise<void>` — 수식 설정. 셀 타입을 `str` 로 두고 캐시 값(v)은 비운다. `undefined` 면 셀 삭제. 수식 문자열은 `=` 없이 본문만(예: `"SUM(A1:A3)"`).

병합:

- `merge(r: number, c: number): Promise<void>` — 현재 셀(좌상단)부터 끝 좌표 `(r, c)`(0 기반, inclusive)까지 병합. 예: `ws.cell(0,0).merge(2,2)` → A1:C3(3×3) 병합.

스타일:

- `getStyleId(): Promise<string | undefined>` — 셀의 styles.xml cellXfs 인덱스 ID 반환.
- `setStyleId(styleId: string | undefined): Promise<void>` — 셀 스타일 ID 직접 지정(다른 셀과 동일 스타일 공유 시). `undefined` 면 스타일 해제.
- `setStyle(opts: ExcelStyleOptions): Promise<void>` — 배경·테두리·정렬·숫자형식·폰트 적용. 기존 셀 스타일이 있으면 clone 후 지정 필드만 병합한다(부분 갱신). 옵션 풀이는 [style.md](./style.md).

값 읽기/쓰기 예:

```typescript
await ws.cell(0, 0).setValue("코드");
await ws.cell(1, 0).setValue(new DateOnly(2026, 6, 3)); // 날짜 numFmt 자동
await ws.cell(1, 1).setFormula("SUM(C2:C10)");
const v = await ws.cell(1, 0).getValue(); // DateOnly 로 복원
```

## ExcelRow

`ws.row(r)` 로 얻는다.

- `cell(c: number): ExcelCell` — 이 행의 0 기반 열 `c` 셀 반환.
- `getCells(): Promise<ExcelCell[]>` — 이 행에서 시트 range 의 열 범위에 해당하는 셀들을 배열로 반환(인덱스 = 열 번호, 앞쪽 빈 열은 비어 있음).

## ExcelCol

`ws.col(c)` 로 얻는다.

- `cell(r: number): ExcelCell` — 이 열의 0 기반 행 `r` 셀 반환.
- `getCells(): Promise<ExcelCell[]>` — 이 열에서 시트 range 의 행 범위에 해당하는 셀들을 배열로 반환(인덱스 = 행 번호).
- `setWidth(size: number): Promise<void>` — 열 너비 설정(엑셀 문자 너비 단위). 열 1개 단위로 cols 정의를 갱신.

열 너비 예:

```typescript
await ws.col(0).setWidth(20);
```

## 주의사항

- 행/열/셀 인덱스는 모두 0 기반(엑셀 화면의 1행/A열 = 인덱스 0).
- `getCells()` 가 반환하는 배열은 range 시작 인덱스부터 채워지므로 앞쪽 인덱스가 비어 있을 수 있다. `for..of` 보다 `range` 경계로 직접 순회하는 편이 안전.
- `setStyle` 은 누적 병합(기존 스타일 위에 지정 필드만 덮어씀)이고, `setStyleId(undefined)` 는 스타일 전체 해제다. 둘을 혼동하지 말 것.
