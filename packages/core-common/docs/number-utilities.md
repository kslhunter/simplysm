# Number Utilities

Imported as the `num` namespace.

```typescript
import { num } from "@simplysm/core-common";
```

## parseInt

```typescript
function parseInt(text: unknown): number | undefined;
```

Parses a string to integer after stripping non-numeric characters (except `0-9`, `-`, `.`). Returns `undefined` for non-parsable input. For strings with decimals, returns only the integer part (truncates).

---

## parseFloat

```typescript
function parseFloat(text: unknown): number | undefined;
```

Parses a string to float after stripping non-numeric characters. Returns `undefined` for non-parsable input.

---

## parseRoundedInt

```typescript
function parseRoundedInt(text: unknown): number | undefined;
```

Parses to float then rounds to the nearest integer.

---

## isNullOrEmpty

```typescript
function isNullOrEmpty(val: number | undefined): val is 0 | undefined;
```

Type guard that returns `true` for `undefined`, `null`, or `0`.

---

## format

```typescript
function format(val: number, digit?: { max?: number; min?: number }): string;
function format(val: number | undefined, digit?: { max?: number; min?: number }): string | undefined;
```

Formats a number with locale-aware thousand separators. Control decimal places with `max` (maximum) and `min` (minimum, zero-padded).

---

## Usage Examples

```typescript
import { num } from "@simplysm/core-common";

num.parseInt("$1,234");           // 1234
num.parseInt("12.34");            // 12
num.parseFloat("$1,234.56");     // 1234.56
num.parseRoundedInt("12.6");     // 13

num.isNullOrEmpty(0);            // true
num.isNullOrEmpty(undefined);    // true
num.isNullOrEmpty(42);           // false

num.format(1234.567, { max: 2 });  // "1,234.57"
num.format(1234, { min: 2 });      // "1,234.00"
```
