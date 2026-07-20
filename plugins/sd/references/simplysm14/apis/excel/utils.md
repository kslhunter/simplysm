# @simplysm/excel — ExcelUtils

A1 주소 ↔ 0 기반 좌표, Excel 날짜 serial ↔ JS timestamp, Excel 숫자 형식 코드/ID/이름을 상호 변환하는 static 유틸 함수 모음. 인스턴스 없이 `ExcelUtils.메서드(...)` 로 호출.

## 주소 변환

```typescript
class ExcelUtils {
  static stringifyAddr(point: ExcelAddressPoint): string;
  static stringifyRowAddr(r: number): string;
  static stringifyColAddr(c: number): string;
  static parseRowAddr(addr: string): number;
  static parseColAddr(addr: string): number;
  static parseCellAddr(addr: string): ExcelAddressPoint;
  static parseRangeAddr(rangeAddr: string): ExcelAddressRangePoint;
  static stringifyRangeAddr(point: ExcelAddressRangePoint): string;
}
```

- `point` — `{ r, c }` 0 기반 셀 좌표.
- `r` — 0 기반 행 인덱스. 반환 행 주소는 `r + 1` 문자열.
- `c` — 0 기반 열 인덱스. 허용 범위 `0~16383`, 벗어나면 throw. 열 문자는 `0 = A` 기준.
- `addr` — 셀 주소 문자열. 행 파싱은 끝 숫자, 열 파싱은 앞 알파벳을 씀.
- `rangeAddr` — `:` 로 구분된 범위 주소. 끝 주소가 없으면 시작과 같은 좌표로 처리.

메서드 동작:

- `stringifyAddr(point)` — 열 문자 + 행 숫자로 셀 주소(`"A1"`)를 만듦.
- `stringifyRowAddr(r)` — 0 기반 행 인덱스를 1 기반 행 주소 문자열로 만듦.
- `stringifyColAddr(c)` — 0 기반 열 인덱스를 Excel 열 문자로 만듦(예: `0→"A"`, `26→"AA"`). 범위 밖이면 throw.
- `parseRowAddr(addr)` — 주소 끝 숫자를 0 기반 행 인덱스로 파싱함. 정수 파싱 실패 시 throw.
- `parseColAddr(addr)` — 주소 앞 알파벳을 0 기반 열 인덱스로 계산함.
- `parseCellAddr(addr)` — `parseRowAddr`/`parseColAddr` 결과를 `{ r, c }` 로 묶음.
- `parseRangeAddr(rangeAddr)` — 시작/끝 셀 주소를 `{ s, e }` 로 파싱함.
- `stringifyRangeAddr(point)` — 시작=끝이면 단일 주소, 다르면 `시작:끝` 문자열을 반환함.

## 날짜 serial 변환

```typescript
static convertTimeTickToNumber(tick: number): number;
static convertNumberToTimeTick(value: number): number;
```

Excel 은 1899-12-30 을 날짜 0(1900-01-01 = 1)으로 계산함.

- `tick` — JS timestamp(ms). 변환 전 timezone offset 을 빼고 Excel serial 숫자를 계산함.
- `value` — Excel 날짜 serial 숫자. timestamp 로 되돌릴 때 timezone offset 을 다시 더함.

메서드 동작:

- `convertTimeTickToNumber(tick)` — timestamp → Excel 날짜 serial 숫자.
- `convertNumberToTimeTick(value)` — Excel 날짜 serial 숫자 → timestamp(ms).

## 숫자 형식 변환

```typescript
static convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat;
static convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat;
static convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number;
```

- `numFmtCode` — Excel formatCode 문자열. 날짜/시간/숫자 패턴 중 어느 것으로도 분류되지 않으면 throw.
- `numFmtId` — Excel 내장 숫자 형식 ID. 알려진 범위 밖이면 throw.
- `numFmtName` — `ExcelNumberFormat` literal.
- 이름→ID(`convertNumFmtNameToId`): `"number"`→`0`, `"DateOnly"`→`14`, `"DateTime"`→`22`, `"Time"`→`18`, `"string"`→`49`.
- ID→이름(`convertNumFmtIdToName`): `0~13`/`37~40`/`48`→`number`, `14~17`/`27~31`/`34~36`/`50~58`→`DateOnly`, `22`→`DateTime`, `18~21`/`32~33`/`45~47`→`Time`, `49`→`string`.

메서드 동작:

- `convertNumFmtCodeToName(numFmtCode)` — formatCode 패턴을 분류함.
  - `General` 은 `number`.
  - 날짜, 시간 token 이 모두 있으면 `DateTime`, 날짜만 있으면 `DateOnly`, 시간만 있으면 `Time`.
  - 숫자 패턴이면 `number`.
  - 시간 문맥의 `mm` 은 분으로 처리해 날짜 판별에서 제외함.
- `convertNumFmtIdToName(numFmtId)` — 내장 ID 범위 표에 따라 분류함.
- `convertNumFmtNameToId(numFmtName)` — literal 을 대표 내장 numFmtId 로 변환함.
