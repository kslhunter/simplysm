# @simplysm/excel — ExcelUtils

A1 주소와 0 기반 좌표, Excel 날짜 serial 과 JS timestamp, Excel 숫자 형식 코드/ID/이름을 변환하는 static 유틸 클래스. 인스턴스 없이 `ExcelUtils.method(...)` 로 호출한다.

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

- `point.r` — 0 기반 행 인덱스. 문자열 행 주소로 바꿀 때 1을 더한다.
- `point.c` — 0 기반 열 인덱스. 열 문자로 바꿀 때 `0 = A` 기준으로 계산한다.
- `r` — 0 기반 행 인덱스. 반환 문자열은 `r + 1`.
- `c` — 0 기반 열 인덱스. 허용 범위는 `0~16383` 이며 벗어나면 throw 한다.
- `addr` — 셀 주소 문자열. 행 파싱은 끝 숫자, 열 파싱은 앞 알파벳을 사용한다.
- `rangeAddr` — `:` 로 구분된 범위 주소. 끝 주소가 없으면 시작과 같은 좌표로 처리한다.
- `point.s` — 범위 시작 좌표. `stringifyRangeAddr` 의 시작 주소가 된다.
- `point.e` — 범위 끝 좌표. 시작 주소와 같으면 단일 주소 문자열을 반환한다.

메서드 동작:

- `stringifyAddr(point)` — 열 문자와 행 숫자를 이어 셀 주소로 만든다.
- `stringifyRowAddr(r)` — 0 기반 행 인덱스를 1 기반 행 주소 문자열로 만든다.
- `stringifyColAddr(c)` — 0 기반 열 인덱스를 Excel 열 문자로 만든다.
- `parseRowAddr(addr)` — 주소 끝의 숫자를 정수로 파싱해 0 기반 행 인덱스로 돌려준다. 정수 파싱 실패 시 throw 한다.
- `parseColAddr(addr)` — 주소 앞의 알파벳을 0 기반 열 인덱스로 계산한다.
- `parseCellAddr(addr)` — `parseRowAddr` 와 `parseColAddr` 결과를 `{ r, c }` 로 묶는다.
- `parseRangeAddr(rangeAddr)` — 시작/끝 셀 주소를 `{ s, e }` 로 파싱한다.
- `stringifyRangeAddr(point)` — 시작/끝 주소가 같으면 단일 주소, 다르면 `시작:끝` 문자열을 반환한다.

## 날짜 serial 변환

```typescript
static convertTimeTickToNumber(tick: number): number;
static convertNumberToTimeTick(value: number): number;
```

- `tick` — JavaScript timestamp(ms). 변환 전에 현재 timezone offset 을 빼고 Excel 날짜 숫자를 계산한다.
- `value` — Excel 날짜 serial 숫자. timestamp 로 되돌릴 때 timezone offset 을 다시 더한다.

메서드 동작:

- `convertTimeTickToNumber(tick)` — timestamp 를 Excel 날짜 serial 숫자로 변환한다.
- `convertNumberToTimeTick(value)` — Excel 날짜 serial 숫자를 timestamp(ms) 로 변환한다.

## 숫자 형식 변환

```typescript
static convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat;
static convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat;
static convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number;
```

- `numFmtCode` — Excel formatCode 문자열. 날짜/시간/숫자 패턴으로 분류되지 않으면 throw 한다.
- `numFmtId` — Excel 내장 숫자 형식 ID. 알려진 범위 밖이면 throw 한다.
- `numFmtName` — `ExcelNumberFormat` literal. 내장 ID 로 변환된다.
- `"number"` — 이름→ID 변환 시 `0`; ID→이름 변환에서는 `0~13`, `37~40`, `48` 이 이 값으로 분류된다.
- `"DateOnly"` — 이름→ID 변환 시 `14`; ID→이름 변환에서는 `14~17`, `27~31`, `34~36`, `50~58` 이 이 값으로 분류된다.
- `"DateTime"` — 이름→ID 변환 시 `22`; ID→이름 변환에서도 `22` 가 이 값으로 분류된다.
- `"Time"` — 이름→ID 변환 시 `18`; ID→이름 변환에서는 `18~21`, `32~33`, `45~47` 이 이 값으로 분류된다.
- `"string"` — 이름→ID 변환 시 `49`; ID→이름 변환에서도 `49` 가 이 값으로 분류된다.

메서드 동작:

- `convertNumFmtCodeToName(numFmtCode)` — `General` 은 `number`, 날짜 token 과 시간 token 이 모두 있으면 `DateTime`, 날짜만 있으면 `DateOnly`, 시간만 있으면 `Time`, 숫자 패턴이면 `number` 를 반환한다.
- `convertNumFmtIdToName(numFmtId)` — 내장 ID 범위 표에 따라 `ExcelNumberFormat` 으로 분류한다.
- `convertNumFmtNameToId(numFmtName)` — `ExcelNumberFormat` literal 을 대표 내장 numFmtId 로 변환한다.