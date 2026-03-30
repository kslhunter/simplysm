# Utils

## `ExcelUtils`

Static utility class for Excel address conversion, date/number conversion, and number format handling.

```typescript
export class ExcelUtils {
  static stringifyAddr(point: ExcelAddressPoint): string;
  static stringifyRowAddr(r: number): string;
  static stringifyColAddr(c: number): string;
  static parseRowAddr(addr: string): number;
  static parseColAddr(addr: string): number;
  static parseCellAddr(addr: string): ExcelAddressPoint;
  static parseRangeAddr(rangeAddr: string): ExcelAddressRangePoint;
  static stringifyRangeAddr(point: ExcelAddressRangePoint): string;
  static convertTimeTickToNumber(tick: number): number;
  static convertNumberToTimeTick(value: number): number;
  static convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat;
  static convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat;
  static convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number;
}
```

### Methods

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `stringifyAddr` | `point: ExcelAddressPoint` | `string` | Convert coordinate to "A1" format string |
| `stringifyRowAddr` | `r: number` | `string` | Convert row index (0-based) to row address (e.g. 0 -> "1") |
| `stringifyColAddr` | `c: number` | `string` | Convert column index (0-based) to column address (e.g. 0 -> "A", 26 -> "AA"). Range: 0-16383 |
| `parseRowAddr` | `addr: string` | `number` | Extract row index from cell address (e.g. "A3" -> 2) |
| `parseColAddr` | `addr: string` | `number` | Extract column index from cell address (e.g. "B3" -> 1) |
| `parseCellAddr` | `addr: string` | `ExcelAddressPoint` | Parse cell address to coordinate (e.g. "B3" -> `{r: 2, c: 1}`) |
| `parseRangeAddr` | `rangeAddr: string` | `ExcelAddressRangePoint` | Parse range address to coordinates (e.g. "A1:C3" -> `{s: {r:0,c:0}, e: {r:2,c:2}}`) |
| `stringifyRangeAddr` | `point: ExcelAddressRangePoint` | `string` | Convert range coordinates to address string |
| `convertTimeTickToNumber` | `tick: number` | `number` | Convert JS timestamp (ms) to Excel date number (1900 date system) |
| `convertNumberToTimeTick` | `value: number` | `number` | Convert Excel date number to JS timestamp (ms) |
| `convertNumFmtCodeToName` | `numFmtCode: string` | `ExcelNumberFormat` | Convert number format code string to format name |
| `convertNumFmtIdToName` | `numFmtId: number` | `ExcelNumberFormat` | Convert built-in number format ID to format name |
| `convertNumFmtNameToId` | `numFmtName: ExcelNumberFormat` | `number` | Convert format name to built-in number format ID |
