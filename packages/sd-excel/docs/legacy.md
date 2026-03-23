# Legacy

Read-only Excel reader using the `xlsx` (SheetJS) library. Supports older Excel file formats (`.xls`, `.xlsx`, `.xlsb`).

## SdExcelReader

Read-only workbook reader. Wraps the SheetJS `XLSX.read()` API with Korean codepage (949) support.

```typescript
class SdExcelReader {
  constructor(data: Buffer);

  get sheetNames(): string[];

  getWorkSheet(name: string): SdExcelReaderWorksheet;
  getWorkSheet(index: number): SdExcelReaderWorksheet;
}
```

### Constructor

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Buffer` | The Excel file data to read |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `sheetNames` | `string[]` | List of all worksheet names in the workbook |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getWorkSheet(name)` | `SdExcelReaderWorksheet` | Returns the worksheet with the given name. Throws if not found |
| `getWorkSheet(index)` | `SdExcelReaderWorksheet` | Returns the worksheet at the given zero-based index. Throws if not found |

---

## SdExcelReaderWorksheet

Read-only worksheet. Provides direct cell value access and data table extraction.

```typescript
class SdExcelReaderWorksheet {
  constructor(private readonly _ws: XLSX.WorkSheet);

  get range(): XLSX.Range;

  val(r: number, c: number): string | number | boolean | Date | undefined;
  dataTable(
    startRow?: number,
    startCol?: number,
    endRow?: number,
    endCol?: number,
  ): SdExcelReaderDataTable;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `range` | `XLSX.Range` | The used range of the worksheet (`{ s: { r, c }, e: { r, c } }`) |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `val(r, c)` | `string \| number \| boolean \| Date \| undefined` | Returns the raw cell value at zero-based row `r` and column `c` |
| `dataTable(startRow?, startCol?, endRow?, endCol?)` | `SdExcelReaderDataTable` | Creates a data table view over a sub-range of the worksheet. Negative values are relative to the range boundaries |

### dataTable parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `startRow` | `number \| undefined` | Starting row (0-based). Negative values offset from `range.s.r`. Defaults to `range.s.r` |
| `startCol` | `number \| undefined` | Starting column (0-based). Negative values offset from `range.s.c`. Defaults to `range.s.c` |
| `endRow` | `number \| undefined` | Ending row (0-based). Negative values offset from `range.e.r`. Defaults to `range.e.r` |
| `endCol` | `number \| undefined` | Ending column (0-based). Negative values offset from `range.e.c`. Defaults to `range.e.c` |

---

## SdExcelReaderDataTable

Table view over a rectangular region of a worksheet. The first row of the region is used as column headers, and subsequent rows are data rows.

```typescript
class SdExcelReaderDataTable {
  constructor(
    private readonly _sws: SdExcelReaderWorksheet,
    private readonly _range: XLSX.Range,
  );

  get rowLength(): number;
  get headers(): (string | undefined)[];

  val(r: number, colName: string): any;
  map<R>(cb: (r: number) => R, filterCb?: (r: number) => boolean): R[];
  mapMany<R>(cb: (r: number) => R[], filterCb?: (r: number) => boolean): R[];
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `rowLength` | `number` | Number of data rows (excludes the header row) |
| `headers` | `(string \| undefined)[]` | Array of header names indexed by column number. Duplicate headers throw an error during construction |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `val(r, colName)` | `any` | Returns the value at data row `r` (0-based, relative to header) and the column with the given header name. Returns `undefined` if the column name is not found |
| `map(cb, filterCb?)` | `R[]` | Iterates over all data rows, applying `cb` to each row index. Optional `filterCb` filters rows before mapping |
| `mapMany(cb, filterCb?)` | `R[]` | Like `map`, but `cb` returns arrays that are flattened into a single result |
