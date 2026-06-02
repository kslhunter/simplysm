# @simplysm/excel — ExcelUtils

셀 주소(A1 표기) ↔ 좌표 변환, Excel 날짜 시리얼 ↔ 타임스탬프 변환, 숫자형식 코드/ID/이름 상호 변환이 필요할 때 읽는다. 모든 메서드는 `static` 이라 인스턴스 없이 `ExcelUtils.xxx()` 로 호출.

## 주소 변환

- `stringifyAddr(point: ExcelAddressPoint): string` — 0 기반 좌표 `{r,c}` → `"A1"`. 로그·범위 ref 조립에 사용.
- `stringifyRowAddr(r: number): string` — 행 인덱스 → 행 문자열(0 → `"1"`).
- `stringifyColAddr(c: number): string` — 열 인덱스 → 열 문자(0 → `"A"`, 26 → `"AA"`). 0~16383 범위 밖이면 throw.
- `parseRowAddr(addr: string): number` — 주소 문자열에서 0 기반 행 인덱스(`"A3"` → 2). 파싱 실패 시 throw.
- `parseColAddr(addr: string): number` — 주소 문자열에서 0 기반 열 인덱스(`"B3"` → 1).
- `parseCellAddr(addr: string): ExcelAddressPoint` — 셀 주소 → 좌표(`"B3"` → `{r:2,c:1}`).
- `parseRangeAddr(rangeAddr: string): ExcelAddressRangePoint` — 범위 주소 → 좌표 범위(`"A1:C3"` → `{s:{r:0,c:0}, e:{r:2,c:2}}`). `:` 없으면 단일 셀을 `s===e` 로.
- `stringifyRangeAddr(point: ExcelAddressRangePoint): string` — 좌표 범위 → 문자열(`"A1:C3"`). `s===e` 면 단일 셀 문자열만 반환.

## 날짜 변환

Excel 은 1900-01-01 을 1 로 계산(1899-12-30 이 날짜 0). 변환 시 로컬 타임존을 보정한다.

- `convertTimeTickToNumber(tick: number): number` — JS 타임스탬프(ms) → Excel 날짜 시리얼 숫자.
- `convertNumberToTimeTick(value: number): number` — Excel 날짜 시리얼 숫자 → JS 타임스탬프(ms).

## 숫자형식 변환

- `convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat` — formatCode 문자열을 분석해 `"number"`/`"DateOnly"`/`"DateTime"`/`"Time"`/`"string"` 판별. `"General"` 은 `"number"`. 시간 문맥의 `mm`(분)은 날짜 판별에서 제외. 어디에도 해당 안 되면 throw.
- `convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat` — Excel 내장 numFmtId 를 형식명으로. 범위: 0~13·37~40·48 → `"number"`, 14~17·27~31·34~36·50~58 → `"DateOnly"`, 22 → `"DateTime"`, 18~21·32~33·45~47 → `"Time"`, 49 → `"string"`. 범위 밖이면 throw.
- `convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number` — 역방향. `"number"` → 0, `"DateOnly"` → 14, `"DateTime"` → 22, `"Time"` → 18, `"string"` → 49.

## 사용 예

```typescript
const { r, c } = ExcelUtils.parseCellAddr("C5");                       // { r: 4, c: 2 }
const ref = ExcelUtils.stringifyRangeAddr({ s: { r: 0, c: 0 }, e: { r: 9, c: 1 } }); // "A1:B10"
const serial = ExcelUtils.convertTimeTickToNumber(Date.now());        // Excel 날짜 숫자
```
