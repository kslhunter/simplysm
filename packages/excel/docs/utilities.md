# Utilities

## `ExcelUtils`

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

### 주소 변환 메서드

#### `stringifyAddr(point)`

셀 좌표를 "A1" 형식 문자열로 변환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `point` | `ExcelAddressPoint` | 셀 좌표 (`{ r: number; c: number }`) |

**반환값:** `string` - 예: `{ r: 0, c: 0 }` -> `"A1"`, `{ r: 2, c: 3 }` -> `"D3"`

#### `stringifyRowAddr(r)`

행 인덱스(0 기반)를 행 주소 문자열로 변환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `r` | `number` | 행 인덱스 (0 기반) |

**반환값:** `string` - 예: `0` -> `"1"`, `9` -> `"10"`

#### `stringifyColAddr(c)`

열 인덱스(0 기반)를 열 주소 문자열로 변환한다. 열 인덱스는 0~16383 범위여야 한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `c` | `number` | 열 인덱스 (0 기반) |

**반환값:** `string` - 예: `0` -> `"A"`, `25` -> `"Z"`, `26` -> `"AA"`

#### `parseRowAddr(addr)`

셀 주소에서 행 인덱스를 추출한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `addr` | `string` | 셀 주소 (예: `"A3"`) |

**반환값:** `number` - 0 기반 행 인덱스. 예: `"A3"` -> `2`

#### `parseColAddr(addr)`

셀 주소에서 열 인덱스를 추출한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `addr` | `string` | 셀 주소 (예: `"B3"`) |

**반환값:** `number` - 0 기반 열 인덱스. 예: `"B3"` -> `1`

#### `parseCellAddr(addr)`

셀 주소를 좌표로 변환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `addr` | `string` | 셀 주소 (예: `"B3"`) |

**반환값:** `ExcelAddressPoint` - 예: `"B3"` -> `{ r: 2, c: 1 }`

#### `parseRangeAddr(rangeAddr)`

범위 주소를 좌표로 변환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `rangeAddr` | `string` | 범위 주소 (예: `"A1:C3"`) |

**반환값:** `ExcelAddressRangePoint` - 예: `"A1:C3"` -> `{ s: { r: 0, c: 0 }, e: { r: 2, c: 2 } }`

#### `stringifyRangeAddr(point)`

범위 좌표를 주소 문자열로 변환한다. 시작과 끝이 같으면 단일 셀 주소를 반환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `point` | `ExcelAddressRangePoint` | 범위 좌표 |

**반환값:** `string` - 예: `"A1:C3"` 또는 `"A1"` (단일 셀)

### 날짜/숫자 변환 메서드

#### `convertTimeTickToNumber(tick)`

JavaScript 타임스탬프(ms)를 Excel 날짜 숫자로 변환한다. Excel은 1900-01-01을 1로 계산한다 (1899-12-30이 날짜 0).

| Parameter | Type | Description |
|-----------|------|-------------|
| `tick` | `number` | JavaScript 타임스탬프 (밀리초) |

**반환값:** `number` - Excel 날짜 숫자

#### `convertNumberToTimeTick(value)`

Excel 날짜 숫자를 JavaScript 타임스탬프(ms)로 변환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `number` | Excel 날짜 숫자 |

**반환값:** `number` - JavaScript 타임스탬프 (밀리초)

### 숫자 형식 처리 메서드

#### `convertNumFmtCodeToName(numFmtCode)`

숫자 형식 코드를 형식 이름으로 변환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `numFmtCode` | `string` | 숫자 형식 코드 (예: `"General"`, `"yyyy-mm-dd"`) |

**반환값:** `ExcelNumberFormat` - `"number"`, `"string"`, `"DateOnly"`, `"DateTime"`, `"Time"` 중 하나

**변환 규칙:**

| 형식 코드 패턴 | 반환값 |
|----------------|--------|
| `"General"` | `"number"` |
| `yy`, `dd`, `mm`(날짜 문맥) 포함 + 시간 포함 | `"DateTime"` |
| `yy`, `dd`, `mm`(날짜 문맥) 포함 | `"DateOnly"` |
| `h`, `ss` 포함 | `"Time"` |
| 숫자 패턴 (`0`, `#`, `.` 등) | `"number"` |

#### `convertNumFmtIdToName(numFmtId)`

Excel 내장 숫자 형식 ID를 형식 이름으로 변환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `numFmtId` | `number` | 숫자 형식 ID |

**반환값:** `ExcelNumberFormat`

**내장 형식 ID 범위:**

| ID 범위 | 형식 |
|---------|------|
| 0~13, 37~40, 48 | `"number"` (숫자/일반/통화/퍼센트) |
| 14~17, 27~31, 34~36, 50~58 | `"DateOnly"` (날짜, 로컬라이즈 포함) |
| 22 | `"DateTime"` (날짜+시간) |
| 18~21, 32~33, 45~47 | `"Time"` (시간) |
| 49 | `"string"` (텍스트) |

#### `convertNumFmtNameToId(numFmtName)`

숫자 형식 이름을 형식 ID로 변환한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `numFmtName` | `ExcelNumberFormat` | 형식 이름 |

**반환값:** `number`

**매핑:**

| 형식 이름 | ID |
|-----------|-----|
| `"number"` | 0 |
| `"DateOnly"` | 14 |
| `"DateTime"` | 22 |
| `"Time"` | 18 |
| `"string"` | 49 |
