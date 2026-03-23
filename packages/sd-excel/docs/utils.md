# Utils

Utility classes for cell address conversion, number format mapping, and zip archive caching.

## SdExcelUtils

Static utility class for Excel address parsing/stringifying, date-number conversion, and number format mapping.

```typescript
class SdExcelUtils {
  static stringifyAddr(point: { r: number; c: number }): string;
  static stringifyRowAddr(r: number): string;
  static stringifyColAddr(c: number): string;
  static parseRowAddrCode(addrCode: string): number;
  static parseColAddrCode(addrCode: string): number;
  static parseCellAddrCode(addr: string): { r: number; c: number };
  static parseRangeAddrCode(rangeAddr: string): {
    s: { r: number; c: number };
    e: { r: number; c: number };
  };
  static stringifyRangeAddr(point: {
    s: { r: number; c: number };
    e: { r: number; c: number };
  }): string;
  static convertTimeTickToNumber(tick: number): number;
  static convertNumberToTimeTick(num: number): number;
  static convertNumFmtCodeToName(numFmtCode: string): TSdExcelNumberFormat;
  static convertNumFmtIdToName(numFmtId: number): TSdExcelNumberFormat;
  static convertNumFmtNameToId(numFmtName: TSdExcelNumberFormat | undefined): number;
}
```

### Address methods

| Method | Returns | Description |
|--------|---------|-------------|
| `stringifyAddr(point)` | `string` | Converts `{ r: 0, c: 0 }` to `"A1"` |
| `stringifyRowAddr(r)` | `string` | Converts zero-based row index to 1-based string (e.g., `0` -> `"1"`) |
| `stringifyColAddr(c)` | `string` | Converts zero-based column index to letter(s) (e.g., `0` -> `"A"`, `26` -> `"AA"`) |
| `parseRowAddrCode(addrCode)` | `number` | Extracts the zero-based row index from an address string (e.g., `"A1"` -> `0`) |
| `parseColAddrCode(addrCode)` | `number` | Extracts the zero-based column index from an address string (e.g., `"B1"` -> `1`) |
| `parseCellAddrCode(addr)` | `{ r: number; c: number }` | Parses a full cell address to zero-based `{ r, c }` (e.g., `"C3"` -> `{ r: 2, c: 2 }`) |
| `parseRangeAddrCode(rangeAddr)` | `{ s: { r, c }, e: { r, c } }` | Parses a range address (e.g., `"A1:C3"`) to zero-based start/end points. Single-cell ranges (e.g., `"A1"`) set `s` and `e` to the same point |
| `stringifyRangeAddr(point)` | `string` | Converts a range to a string (e.g., `"A1:C3"` or `"A1"` for single-cell ranges) |

### Date/number conversion methods

| Method | Returns | Description |
|--------|---------|-------------|
| `convertTimeTickToNumber(tick)` | `number` | Converts a JavaScript timestamp (milliseconds) to an Excel serial date number. Adjusts for timezone offset |
| `convertNumberToTimeTick(num)` | `number` | Converts an Excel serial date number to a JavaScript timestamp (milliseconds). Adjusts for timezone offset |

### Number format mapping methods

| Method | Returns | Description |
|--------|---------|-------------|
| `convertNumFmtCodeToName(numFmtCode)` | `TSdExcelNumberFormat` | Maps a format code string to a named format. `"General"` -> `"number"`, date patterns -> `"DateOnly"` or `"DateTime"`, numeric patterns -> `"number"`. Throws for unrecognized codes |
| `convertNumFmtIdToName(numFmtId)` | `TSdExcelNumberFormat` | Maps a built-in number format ID to a named format. IDs 0-13, 37-40, 48 -> `"number"`, IDs 14-17, 27-31, 34-36, 50-58 -> `"DateOnly"`, ID 22 -> `"DateTime"`, IDs 18-21, 32-33, 45-47 -> `"Time"`, ID 49 -> `"string"`. Throws for unknown IDs |
| `convertNumFmtNameToId(numFmtName)` | `number` | Maps a named format to a built-in ID. `"number"` -> `0`, `"DateOnly"` -> `14`, `"DateTime"` -> `22`, `"Time"` -> `18`, `"string"` -> `49`. Throws for unknown names |

---

## ZipCache

Lazy-loading cache layer over the `.xlsx` zip archive. Reads and deserializes XML files on first access, and tracks modifications for serialization.

```typescript
class ZipCache {
  constructor(arg?: Blob | Buffer);

  async getAsync(filePath: string): Promise<ISdExcelXml | Buffer | undefined>;
  async existsAsync(filePath: string): Promise<boolean>;
  set(filePath: string, content: ISdExcelXml | Buffer): void;
  async toBufferAsync(): Promise<Buffer>;
  async closeAsync(): Promise<void>;
}
```

### Constructor

| Parameter | Type | Description |
|-----------|------|-------------|
| `arg` | `Blob \| Buffer \| undefined` | Optional. When provided, wraps an existing zip archive. When omitted, starts with an empty archive |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getAsync(filePath)` | `Promise<ISdExcelXml \| Buffer \| undefined>` | Returns the cached content for the given path. On first access, reads from the zip and auto-detects the XML type: `.rels` -> `SdExcelXmlRelationShip`, `[Content_Types].xml` -> `SdExcelXmlContentType`, `xl/workbook.xml` -> `SdExcelXmlWorkbook`, `xl/worksheets/sheet*` -> `SdExcelXmlWorksheet`, `xl/drawings/drawing*` -> `SdExcelXmlDrawing`, `xl/sharedStrings.xml` -> `SdExcelXmlSharedString`, `xl/styles.xml` -> `SdExcelXmlStyle`, other XML -> `SdExcelXmlUnknown`, non-XML -> raw `Buffer` |
| `existsAsync(filePath)` | `Promise<boolean>` | Returns `true` if the file exists in the cache or the underlying zip |
| `set(filePath, content)` | `void` | Stores content in the cache (does not write to zip until `toBufferAsync()`) |
| `toBufferAsync()` | `Promise<Buffer>` | Serializes all cached entries back to the zip. XML objects are cleaned up (via `cleanup()`) and converted to XML strings. Returns the compressed zip as a `Buffer` |
| `closeAsync()` | `Promise<void>` | Closes the underlying zip and clears the cache |
