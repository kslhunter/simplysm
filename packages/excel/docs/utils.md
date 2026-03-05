# ExcelUtils

A static utility class providing cell address conversion, date/number conversion, and number format processing.

```typescript
import { ExcelUtils } from "@simplysm/excel";

// Convert 0-based coordinates to "A1" notation
ExcelUtils.stringifyAddr({ r: 0, c: 0 }); // "A1"

// Convert column index to column letter
ExcelUtils.stringifyColAddr(0);  // "A"
ExcelUtils.stringifyColAddr(26); // "AA"

// Convert row index to row number string
ExcelUtils.stringifyRowAddr(0); // "1"

// Parse cell address
ExcelUtils.parseCellAddr("B3"); // { r: 2, c: 1 }
ExcelUtils.parseRowAddr("B3"); // 2
ExcelUtils.parseColAddr("B3"); // 1

// Parse range address
ExcelUtils.parseRangeAddr("A1:C3"); // { s: { r: 0, c: 0 }, e: { r: 2, c: 2 } }

// Convert range coordinates to address string
ExcelUtils.stringifyRangeAddr({ s: { r: 0, c: 0 }, e: { r: 2, c: 2 } }); // "A1:C3"

// Date/number conversion (Excel serial date <-> JS timestamp)
const excelNum = ExcelUtils.convertTimeTickToNumber(Date.now());
const tick = ExcelUtils.convertNumberToTimeTick(excelNum);

// Number format conversions
ExcelUtils.convertNumFmtCodeToName("General"); // "number"
ExcelUtils.convertNumFmtIdToName(14);          // "DateOnly"
ExcelUtils.convertNumFmtNameToId("DateTime");  // 22
```

## Static Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `stringifyAddr` | `(point: ExcelAddressPoint) => string` | Convert coordinates to "A1" format |
| `stringifyRowAddr` | `(r: number) => string` | Convert 0-based row index to row number string |
| `stringifyColAddr` | `(c: number) => string` | Convert 0-based column index to column letter(s) |
| `parseRowAddr` | `(addr: string) => number` | Extract 0-based row index from cell address |
| `parseColAddr` | `(addr: string) => number` | Extract 0-based column index from cell address |
| `parseCellAddr` | `(addr: string) => ExcelAddressPoint` | Convert cell address string to coordinates |
| `parseRangeAddr` | `(rangeAddr: string) => ExcelAddressRangePoint` | Convert range address to coordinate pair |
| `stringifyRangeAddr` | `(point: ExcelAddressRangePoint) => string` | Convert coordinate pair to range address string |
| `convertTimeTickToNumber` | `(tick: number) => number` | Convert JS timestamp (ms) to Excel serial date number |
| `convertNumberToTimeTick` | `(num: number) => number` | Convert Excel serial date number to JS timestamp (ms) |
| `convertNumFmtCodeToName` | `(numFmtCode: string) => ExcelNumberFormat` | Convert format code string to format name |
| `convertNumFmtIdToName` | `(numFmtId: number) => ExcelNumberFormat` | Convert built-in format ID to format name |
| `convertNumFmtNameToId` | `(numFmtName: ExcelNumberFormat) => number` | Convert format name to built-in format ID |
