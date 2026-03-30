# Core Classes

Core classes for reading and writing Excel workbooks, worksheets, rows, columns, and cells.

## ExcelCell

Represents a single Excel cell. Provides value read/write, formula, style, and cell merge operations.

All methods are `async` because XML data (SharedStrings, Styles) is loaded on-demand for memory efficiency with large files.

### Properties

| Property | Type | Description |
|---|---|---|
| `addr` | `readonly ExcelAddressPoint` | Cell address (0-based row/column index) |

### Public Methods

| Method | Signature | Description |
|---|---|---|
| `setValue` | `(val: ExcelValueType) => Promise<void>` | Set cell value. Pass `undefined` to delete the cell. Handles string, number, boolean, DateOnly, DateTime, and Time types. Date/time values automatically apply the corresponding number format. |
| `getValue` | `() => Promise<ExcelValueType>` | Read cell value. Returns the typed value based on cell type and number format. SharedString references are resolved automatically. |
| `setFormula` | `(val: string \| undefined) => Promise<void>` | Set cell formula. Pass `undefined` to remove the formula. |
| `getFormula` | `() => Promise<string \| undefined>` | Get cell formula. |
| `merge` | `(r: number, c: number) => Promise<void>` | Merge from this cell to the given end coordinate (0-based). Example: `cell(0,0).merge(2,2)` merges A1:C3. |
| `getStyleId` | `() => Promise<string \| undefined>` | Get the raw style ID of the cell. |
| `setStyleId` | `(styleId: string \| undefined) => Promise<void>` | Set the raw style ID of the cell. |
| `setStyle` | `(opts: ExcelStyleOptions) => Promise<void>` | Set cell style (background, border, alignment, number format). |

## ExcelRow

Represents a row in an Excel worksheet. Provides cell access.

### Public Methods

| Method | Signature | Description |
|---|---|---|
| `cell` | `(c: number) => ExcelCell` | Get cell at column index (0-based). Cached per instance. |
| `getCells` | `() => Promise<ExcelCell[]>` | Get all cells in the row (within the worksheet's data range). |

## ExcelCol

Represents a column in an Excel worksheet. Provides cell access and column width control.

### Public Methods

| Method | Signature | Description |
|---|---|---|
| `cell` | `(r: number) => ExcelCell` | Get cell at row index (0-based). Cached per instance. |
| `getCells` | `() => Promise<ExcelCell[]>` | Get all cells in the column (within the worksheet's data range). |
| `setWidth` | `(size: number) => Promise<void>` | Set column width. |

## ExcelWorksheet

Represents an Excel worksheet. Provides cell access, row/column copy, data table processing, image insertion, and view settings.

### Public Methods

#### Name

| Method | Signature | Description |
|---|---|---|
| `getName` | `() => Promise<string>` | Get worksheet name. |
| `setName` | `(newName: string) => Promise<void>` | Rename the worksheet. |

#### Cell Access

| Method | Signature | Description |
|---|---|---|
| `row` | `(r: number) => ExcelRow` | Get row object (0-based). Cached per instance. |
| `cell` | `(r: number, c: number) => ExcelCell` | Get cell object (0-based row/column). |
| `col` | `(c: number) => ExcelCol` | Get column object (0-based). Cached per instance. |

#### Copy

| Method | Signature | Description |
|---|---|---|
| `copyRowStyle` | `(srcR: number, targetR: number) => Promise<void>` | Copy styles from source row to target row (all columns in range). |
| `copyCellStyle` | `(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint) => Promise<void>` | Copy style from source cell to target cell. |
| `copyRow` | `(srcR: number, targetR: number) => Promise<void>` | Copy source row to target row (overwrite). |
| `copyCell` | `(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint) => Promise<void>` | Copy source cell to target cell. |
| `insertCopyRow` | `(srcR: number, targetR: number) => Promise<void>` | Insert-copy source row at target position. Existing rows at and below target are shifted down by one. Merge cells spanning the insertion point are automatically extended. |

#### Range & Data

| Method | Signature | Description |
|---|---|---|
| `getRange` | `() => Promise<ExcelAddressRangePoint>` | Get the data range of the worksheet. |
| `getCells` | `() => Promise<ExcelCell[][]>` | Get all cells as a 2D array. |
| `getDataTable` | `(opt?: { headerRowIndex?: number; checkEndColIndex?: number; usableHeaderNameFn?: (headerName: string) => boolean }) => Promise<Record<string, ExcelValueType>[]>` | Read worksheet data as an array of records. First row (or `headerRowIndex`) is used as headers. `checkEndColIndex` stops reading when that column is empty. `usableHeaderNameFn` filters which headers to include. |
| `setDataMatrix` | `(matrix: ExcelValueType[][]) => Promise<void>` | Write a 2D array to the worksheet (row-major, index 0 is first row). |
| `setRecords` | `(records: Record<string, ExcelValueType>[]) => Promise<void>` | Write an array of records. Headers are auto-generated in the first row from record keys. |

#### View

| Method | Signature | Description |
|---|---|---|
| `setZoom` | `(percent: number) => Promise<void>` | Set zoom level (percent). |
| `freezeAt` | `(point: { r?: number; c?: number }) => Promise<void>` | Freeze rows/columns at the given position. |

#### Image

| Method | Signature | Description |
|---|---|---|
| `addImage` | `(opts: { bytes: Bytes; ext: string; from: { r: number; c: number; rOff?: number \| string; cOff?: number \| string }; to?: { r: number; c: number; rOff?: number \| string; cOff?: number \| string } }) => Promise<void>` | Insert an image. `bytes` is the image binary data, `ext` is the file extension (e.g., "png"). `from`/`to` define the anchor coordinates (0-based). Offsets are in EMU. If `to` is omitted, the image spans one cell from `from`. |

## ExcelWorkbook

Excel workbook processing class. Manages ZIP resources internally. Supports `await using` for automatic resource cleanup.

### Constructor

```typescript
constructor(arg?: Blob | Bytes)
```

- `arg`: Existing Excel file data (Blob or Uint8Array). Omit to create a new empty workbook.

### Properties

| Property | Type | Description |
|---|---|---|
| `zipCache` | `readonly ZipCache` | Internal ZIP cache (advanced usage). |

### Public Methods

#### Worksheet

| Method | Signature | Description |
|---|---|---|
| `getWorksheetNames` | `() => Promise<string[]>` | Get all worksheet names. |
| `addWorksheet` | `(name: string) => Promise<ExcelWorksheet>` | Create and return a new worksheet. |
| `getWorksheet` | `(nameOrIndex: string \| number) => Promise<ExcelWorksheet>` | Get worksheet by name or 0-based index. Throws if not found. |

#### Export

| Method | Signature | Description |
|---|---|---|
| `toBytes` | `() => Promise<Bytes>` | Export workbook as byte array. |
| `toBlob` | `() => Promise<Blob>` | Export workbook as Blob (MIME: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`). |

#### Lifecycle

| Method | Signature | Description |
|---|---|---|
| `close` | `() => Promise<void>` | Release resources. Safe to call on already-closed workbooks (no-op). After calling, the instance cannot be used. |
| `[Symbol.asyncDispose]` | `() => Promise<void>` | Async dispose support (`await using`). Calls `close()`. |
