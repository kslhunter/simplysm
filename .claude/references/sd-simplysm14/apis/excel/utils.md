# @simplysm/excel — ExcelUtils

셀 주소(A1 ↔ 좌표) 변환, 엑셀 날짜 시리얼 ↔ JS 타임스탬프 변환, 숫자형식 코드/ID/이름 상호 변환이 필요할 때 쓰는 static 유틸 클래스. 모든 메서드가 정적이므로 인스턴스 생성 없이 `ExcelUtils.xxx(...)` 로 호출. 일반 셀 API 가 내부적으로 쓰지만, 외부에서 주소 문자열 ↔ 좌표를 직접 다룰 때 유용하다.

## 주소 변환

좌표는 `ExcelAddressPoint`(`{ r, c }`, 0 기반), 범위는 `ExcelAddressRangePoint`(`{ s, e }`).

- `stringifyAddr(point: ExcelAddressPoint): string` — 좌표를 `"A1"` 형식 문자열로. 예 `{r:0,c:0}` → `"A1"`.
- `stringifyRowAddr(r: number): string` — 0 기반 행 인덱스를 행 주소 문자열로(예 `0` → `"1"`).
- `stringifyColAddr(c: number): string` — 0 기반 열 인덱스를 열 문자로(예 `0` → `"A"`, `26` → `"AA"`). 범위 0~16383 밖이면 throw.
- `parseRowAddr(addr: string): number` — 셀 주소에서 0 기반 행 인덱스 추출(예 `"A3"` → `2`). 행 숫자 파싱 실패 시 throw.
- `parseColAddr(addr: string): number` — 셀 주소에서 0 기반 열 인덱스 추출(예 `"B3"` → `1`).
- `parseCellAddr(addr: string): ExcelAddressPoint` — 주소를 좌표로(예 `"B3"` → `{r:2,c:1}`).
- `parseRangeAddr(rangeAddr: string): ExcelAddressRangePoint` — 범위 주소를 좌표로(예 `"A1:C3"` → `{s:{r:0,c:0}, e:{r:2,c:2}}`). `:` 없는 단일 주소면 `s`=`e`.
- `stringifyRangeAddr(point: ExcelAddressRangePoint): string` — 범위 좌표를 문자열로. `s`=`e` 면 단일 주소 1개만 반환.

## 날짜 시리얼 변환

엑셀은 1900-01-01 을 1 로 세는 시리얼 날짜 체계(1899-12-30 = 0)를 쓴다. 로컬 타임존 보정을 포함한다.

- `convertTimeTickToNumber(tick: number): number` — JS 타임스탬프(ms)를 엑셀 날짜 시리얼 숫자로. 셀에 날짜를 쓸 때 내부적으로 사용.
- `convertNumberToTimeTick(value: number): number` — 엑셀 날짜 시리얼 숫자를 JS 타임스탬프(ms)로. 셀에서 날짜를 읽을 때 사용.

## 숫자형식 변환

`ExcelNumberFormat` = `"number" | "string" | "DateOnly" | "DateTime" | "Time"` 와 엑셀 formatCode/numFmtId 사이 변환.

- `convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat` — formatCode 문자열을 형식 이름으로. `"General"`→`"number"`, yy/dd/mm·h/ss 패턴 조합으로 `"DateOnly"`/`"DateTime"`/`"Time"` 판별(시간 문맥의 `mm` 은 분으로 제외), 숫자 패턴이면 `"number"`. 미해석 코드면 throw.
- `convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat` — 엑셀 내장 형식 ID 를 이름으로. 0~13·37~40·48→`"number"`, 14~17·27~31·34~36·50~58→`"DateOnly"`, 22→`"DateTime"`, 18~21·32~33·45~47→`"Time"`, 49→`"string"`. 그 외 ID 면 throw.
- `convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number` — 이름을 내장 형식 ID 로. `"number"`→0, `"DateOnly"`→14, `"DateTime"`→22, `"Time"`→18, `"string"`→49.

## 사용 예

```typescript
ExcelUtils.parseRangeAddr("A1:C3"); // { s:{r:0,c:0}, e:{r:2,c:2} }
ExcelUtils.stringifyAddr({ r: 1, c: 2 }); // "C2"
ExcelUtils.convertNumFmtIdToName(22); // "DateTime"
```

## 주의사항

- 행/열 인덱스는 0 기반(엑셀 표기 A1 = `{r:0,c:0}`). 엑셀 화면 숫자와 1 차이.
- `stringifyColAddr` 의 유효 열 범위는 0~16383(엑셀 최대 16384열, XFD). 벗어나면 throw.
- 날짜 변환은 시리얼 1 = 1900-01-01 기준이며 타임존 보정이 들어가므로, 직접 산술하지 말고 이 메서드로 왕복.
