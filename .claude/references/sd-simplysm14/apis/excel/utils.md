# @simplysm/excel — ExcelUtils

셀 주소(A1 ↔ 좌표) 변환, 엑셀 날짜 시리얼 ↔ JS 타임스탬프 변환, 숫자형식 코드/ID/이름 상호 변환이 필요할 때 쓰는 static 유틸 클래스. 모든 메서드가 정적이므로 인스턴스 생성 없이 `ExcelUtils.xxx(...)` 로 호출. 일반 셀 API 가 내부적으로 쓰지만, 외부에서 주소 문자열 ↔ 좌표를 직접 다룰 때 유용하다.

## 주소 변환

- `stringifyAddr(point: ExcelAddressPoint): string` — 좌표 `{r,c}`(0 기반)를 `"A1"` 형식으로. 예 `{r:0,c:0}` → `"A1"`.
- `stringifyRowAddr(r: number): string` — 행 인덱스(0 기반)를 행 주소 문자열로. 예 `0` → `"1"`.
- `stringifyColAddr(c: number): string` — 열 인덱스(0 기반)를 열 문자로. 예 `0` → `"A"`, `26` → `"AA"`. 범위 `0~16383` 밖이면 throw.
- `parseRowAddr(addr: string): number` — 주소에서 행 인덱스(0 기반) 추출. 예 `"A3"` → `2`.
- `parseColAddr(addr: string): number` — 주소에서 열 인덱스 추출. 예 `"B3"` → `1`.
- `parseCellAddr(addr: string): ExcelAddressPoint` — 주소를 좌표로. 예 `"B3"` → `{r:2,c:1}`.
- `parseRangeAddr(rangeAddr: string): ExcelAddressRangePoint` — 범위 주소를 좌표로. 예 `"A1:C3"` → `{s:{r:0,c:0}, e:{r:2,c:2}}`. `:` 없으면 단일 셀을 `s`/`e` 양쪽에 채움.
- `stringifyRangeAddr(point: ExcelAddressRangePoint): string` — 범위 좌표를 주소로. `s`==`e` 면 단일 주소로 축약.

## 날짜 시리얼 변환

엑셀은 1899-12-30 을 날짜 0(1900-01-01 = 1)으로 계산한다. 로컬 타임존 보정을 포함한다.

- `convertTimeTickToNumber(tick: number): number` — JS 타임스탬프(ms)를 엑셀 날짜 시리얼 숫자로.
- `convertNumberToTimeTick(value: number): number` — 엑셀 날짜 시리얼 숫자를 JS 타임스탬프(ms)로.

## 숫자형식 변환

`ExcelNumberFormat`(`"number"|"string"|"DateOnly"|"DateTime"|"Time"`) 과 엑셀 numFmtId/formatCode 사이 변환.

- `convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat` — formatCode 문자열을 프리셋 이름으로. `"General"` → `"number"`, `yy`/`dd`/`mm`(시간 문맥 제외) 포함 → 날짜, `h`/`hh`/`ss` 포함 → 시간, 날짜+시간 동시 → `"DateTime"`. 순수 숫자 패턴은 `"number"`. 어느 것도 아니면 throw.
- `convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat` — 내장 형식 ID 를 이름으로. 0~13/37~40/48 → `"number"`, 14~17/27~31/34~36/50~58 → `"DateOnly"`, 22 → `"DateTime"`, 18~21/32~33/45~47 → `"Time"`, 49 → `"string"`. 그 외 throw.
- `convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number` — 이름을 ID 로. `"number"`→0, `"DateOnly"`→14, `"DateTime"`→22, `"Time"`→18, `"string"`→49.

## 사용 예

```typescript
const { s, e } = ExcelUtils.parseRangeAddr("A1:C3"); // {s:{r:0,c:0}, e:{r:2,c:2}}
const addr = ExcelUtils.stringifyAddr({ r: 0, c: 27 }); // "AB1"
```

## 주의사항

- 모든 좌표·인덱스는 0 기반, 주소 문자열은 1 기반(엑셀 표기).
- 날짜 변환은 타임존 보정을 포함하므로 시리얼 ↔ tick 왕복이 로컬 기준으로 일관된다.
- 알 수 없는 numFmtCode/numFmtId 는 silent fallback 없이 throw — 외부 생성 파일의 비정형 형식을 만나면 예외로 드러난다.
