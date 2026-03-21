# Utilities

## `ExcelUtils`

Collection of Excel utility functions. Provides cell address conversion, date/number conversion, and number format processing.

```typescript
import { ExcelUtils } from "@simplysm/excel";
```

### Address Conversion

#### `stringifyAddr`

Convert cell coordinates to "A1" format string.

```typescript
static stringifyAddr(point: ExcelAddressPoint): string;
```

#### `stringifyRowAddr`

Convert row index (0-based) to row address string (e.g. `0` -> `"1"`).

```typescript
static stringifyRowAddr(r: number): string;
```

#### `stringifyColAddr`

Convert column index (0-based) to column address string (e.g. `0` -> `"A"`, `26` -> `"AA"`).

```typescript
static stringifyColAddr(c: number): string;
```

**Throws:** `Error` if column index is outside range `0-16383`.

#### `parseRowAddr`

Extract row index from cell address (e.g. `"A3"` -> `2`).

```typescript
static parseRowAddr(addr: string): number;
```

#### `parseColAddr`

Extract column index from cell address (e.g. `"B3"` -> `1`).

```typescript
static parseColAddr(addr: string): number;
```

#### `parseCellAddr`

Convert cell address to coordinates (e.g. `"B3"` -> `{r: 2, c: 1}`).

```typescript
static parseCellAddr(addr: string): ExcelAddressPoint;
```

#### `parseRangeAddr`

Convert range address to coordinates (e.g. `"A1:C3"` -> `{s: {r:0,c:0}, e: {r:2,c:2}}`).

```typescript
static parseRangeAddr(rangeAddr: string): ExcelAddressRangePoint;
```

#### `stringifyRangeAddr`

Convert range coordinates to address string.

```typescript
static stringifyRangeAddr(point: ExcelAddressRangePoint): string;
```

### Date/Number Conversion

#### `convertTimeTickToNumber`

Convert JavaScript timestamp (ms) to Excel date number. Excel counts 1900-01-01 as 1 (1899-12-30 is date 0).

```typescript
static convertTimeTickToNumber(tick: number): number;
```

#### `convertNumberToTimeTick`

Convert Excel date number to JavaScript timestamp (ms).

```typescript
static convertNumberToTimeTick(value: number): number;
```

### Number Format

#### `convertNumFmtCodeToName`

Convert number format code to format name.

```typescript
static convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat;
```

#### `convertNumFmtIdToName`

Convert number format ID to format name.

```typescript
static convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat;
```

Built-in format ID ranges:
- `0-13, 37-40, 48`: number/general/currency/percent formats
- `14-17, 27-31, 34-36, 50-58`: date formats (including localized)
- `22`: date+time format
- `18-21, 32-33, 45-47`: time formats
- `49`: text format

#### `convertNumFmtNameToId`

Convert number format name to format ID.

```typescript
static convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number;
```
