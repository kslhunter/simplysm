# ExcelUtils

Excel 유틸리티 함수 모음. 셀 주소 변환, 날짜/숫자 변환, 숫자 형식 처리 정적 메서드를 제공한다.

```typescript
export class ExcelUtils {
  // 주소 변환
  static stringifyAddr(point: ExcelAddressPoint): string;
  static stringifyRowAddr(r: number): string;
  static stringifyColAddr(c: number): string;
  static parseRowAddr(addr: string): number;
  static parseColAddr(addr: string): number;
  static parseCellAddr(addr: string): ExcelAddressPoint;
  static parseRangeAddr(rangeAddr: string): ExcelAddressRangePoint;
  static stringifyRangeAddr(point: ExcelAddressRangePoint): string;

  // 날짜/숫자 변환
  static convertTimeTickToNumber(tick: number): number;
  static convertNumberToTimeTick(value: number): number;

  // 숫자 형식 처리
  static convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat;
  static convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat;
  static convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `stringifyAddr` | static | `(point: ExcelAddressPoint) => string` | 셀 좌표를 "A1" 형식 문자열로 변환 |
| `stringifyRowAddr` | static | `(r: number) => string` | 행 인덱스(0 기반)를 행 주소 문자열로 변환 |
| `stringifyColAddr` | static | `(c: number) => string` | 열 인덱스(0 기반)를 열 주소 문자열로 변환. 범위: 0~16383 |
| `parseRowAddr` | static | `(addr: string) => number` | 셀 주소에서 0 기반 행 인덱스 추출 |
| `parseColAddr` | static | `(addr: string) => number` | 셀 주소에서 0 기반 열 인덱스 추출 |
| `parseCellAddr` | static | `(addr: string) => ExcelAddressPoint` | 셀 주소를 좌표로 변환 |
| `parseRangeAddr` | static | `(rangeAddr: string) => ExcelAddressRangePoint` | 범위 주소를 좌표로 변환 |
| `stringifyRangeAddr` | static | `(point: ExcelAddressRangePoint) => string` | 범위 좌표를 주소 문자열로 변환. 시작=끝이면 단일 셀 주소 반환 |
| `convertTimeTickToNumber` | static | `(tick: number) => number` | JavaScript 타임스탬프(ms)를 Excel 날짜 숫자로 변환 |
| `convertNumberToTimeTick` | static | `(value: number) => number` | Excel 날짜 숫자를 JavaScript 타임스탬프(ms)로 변환 |
| `convertNumFmtCodeToName` | static | `(numFmtCode: string) => ExcelNumberFormat` | 숫자 형식 코드를 형식 이름으로 변환 |
| `convertNumFmtIdToName` | static | `(numFmtId: number) => ExcelNumberFormat` | Excel 내장 숫자 형식 ID를 형식 이름으로 변환 |
| `convertNumFmtNameToId` | static | `(numFmtName: ExcelNumberFormat) => number` | 숫자 형식 이름을 형식 ID로 변환 |

## Usage

```typescript
import { ExcelUtils } from "@simplysm/excel";

// 주소 변환
ExcelUtils.stringifyAddr({ r: 0, c: 0 });   // "A1"
ExcelUtils.stringifyAddr({ r: 2, c: 3 });   // "D3"
ExcelUtils.parseCellAddr("B3");             // { r: 2, c: 1 }
ExcelUtils.parseRangeAddr("A1:C3");         // { s: { r: 0, c: 0 }, e: { r: 2, c: 2 } }
ExcelUtils.stringifyRangeAddr({ s: { r: 0, c: 0 }, e: { r: 2, c: 2 } }); // "A1:C3"

ExcelUtils.stringifyRowAddr(0);  // "1"
ExcelUtils.stringifyColAddr(0);  // "A"
ExcelUtils.stringifyColAddr(26); // "AA"
ExcelUtils.parseRowAddr("A3");   // 2
ExcelUtils.parseColAddr("B3");   // 1
```

## `convertNumFmtCodeToName` 변환 규칙

| 형식 코드 패턴 | 반환값 |
|----------------|--------|
| `"General"` | `"number"` |
| `yy`, `dd`, `mm`(날짜 문맥) 포함 + 시간(`h`, `ss`) 포함 | `"DateTime"` |
| `yy`, `dd`, `mm`(날짜 문맥) 포함 | `"DateOnly"` |
| `h`, `ss` 포함 | `"Time"` |
| 숫자 패턴 (`0`, `#`, `.` 등) | `"number"` |

## `convertNumFmtIdToName` 내장 형식 ID 범위

| ID 범위 | 형식 |
|---------|------|
| 0~13, 37~40, 48 | `"number"` (숫자/일반/통화/퍼센트) |
| 14~17, 27~31, 34~36, 50~58 | `"DateOnly"` (날짜, 로컬라이즈 포함) |
| 22 | `"DateTime"` (날짜+시간) |
| 18~21, 32~33, 45~47 | `"Time"` (시간) |
| 49 | `"string"` (텍스트) |

## `convertNumFmtNameToId` 매핑

| 형식 이름 | ID |
|-----------|-----|
| `"number"` | 0 |
| `"DateOnly"` | 14 |
| `"DateTime"` | 22 |
| `"Time"` | 18 |
| `"string"` | 49 |
