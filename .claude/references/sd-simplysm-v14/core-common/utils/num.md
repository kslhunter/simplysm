# num

숫자 유틸리티 네임스페이스.

```typescript
import { num } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parseInt` | `(text: unknown) => number \| undefined` | 문자열을 정수로 파싱. 비숫자 문자 제거 후 파싱. 소수점 이하 버림 |
| `parseFloat` | `(text: unknown) => number \| undefined` | 문자열을 float로 파싱. 비숫자 문자 제거 후 파싱 |
| `parseRoundedInt` | `(text: unknown) => number \| undefined` | 문자열을 float로 파싱한 후 반올림하여 정수 반환 |
| `isNullOrEmpty` | `(val: number \| undefined) => val is 0 \| undefined` | 타입 가드: undefined, null, 0이면 true |
| `format` | `(val: number, digit?) => string` | 천 단위 구분자 포함 문자열로 포맷 |
| `format` | `(val: number \| undefined, digit?) => string \| undefined` | undefined이면 undefined 반환 |

## `parseInt` / `parseFloat` 동작

- 숫자, `-`, `.` 이외의 문자 제거 후 파싱
- 선행 `-`만 음수 부호로 유지 (중간 `-`는 제거)
- 파싱 실패 시 `undefined` 반환

## `format` — `digit` 옵션

| Field | Type | Description |
|-------|------|-------------|
| `max` | `number` | 최대 소수점 자릿수 |
| `min` | `number` | 최소 소수점 자릿수 (부족하면 0으로 채움) |

## Usage

```typescript
import { num } from "@simplysm/core-common";

num.parseInt("1,234.56");   // 1234
num.parseInt("-123");       // -123
num.parseInt("010-1234-5678"); // 1012345678 (중간 - 제거)
num.parseInt("abc");        // undefined

num.parseFloat("1,234.56"); // 1234.56
num.parseRoundedInt("1.7"); // 2

// null/zero 검사 (타입 가드)
const count: number | undefined = getValue();
if (num.isNullOrEmpty(count)) {
  // count: 0 | undefined
} else {
  // count: number (non-zero)
}

num.format(1234567.89, { max: 2 }); // "1,234,567.89"
num.format(1234, { min: 2 });       // "1,234.00"
```
