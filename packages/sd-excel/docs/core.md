# Core

High-level classes for workbook, worksheet, row, column, and cell manipulation.

## SdExcelWorkbook

Top-level workbook class. Create a new empty workbook or load an existing `.xlsx` from a `Buffer` or `Blob`.

```typescript
class SdExcelWorkbook {
  zipCache: ZipCache;

  constructor(arg?: Blob | Buffer);

  async getWorksheetNames(): Promise<string[]>;
  async createWorksheetAsync(name: string): Promise<SdExcelWorksheet>;
  async getWorksheetAsync(nameOrIndex: string | number): Promise<SdExcelWorksheet>;
  async addMediaAsync(buffer: Buffer, ext: string): Promise<string>;
  async getBufferAsync(): Promise<Buffer>;
  async getBlobAsync(): Promise<Blob>;
  async closeAsync(): Promise<void>;
}
```

### Constructor

| Parameter | Type | Description |
|-----------|------|-------------|
| `arg` | `Blob \| Buffer \| undefined` | Optional. When provided, loads an existing `.xlsx` file. When omitted, creates a new empty workbook |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `zipCache` | `ZipCache` | The underlying zip archive cache used for reading/writing XML parts |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getWorksheetNames()` | `Promise<string[]>` | Returns the names of all worksheets in the workbook |
| `createWorksheetAsync(name)` | `Promise<SdExcelWorksheet>` | Creates a new worksheet with the given name and returns it |
| `getWorksheetAsync(nameOrIndex)` | `Promise<SdExcelWorksheet>` | Retrieves an existing worksheet by name or zero-based index. Throws if not found |
| `addMediaAsync(buffer, ext)` | `Promise<string>` | Adds a media file (e.g., image) to the workbook. Returns the internal media path (e.g., `"xl/media/image1.png"`) |
| `getBufferAsync()` | `Promise<Buffer>` | Serializes the workbook to a `Buffer` containing the `.xlsx` file |
| `getBlobAsync()` | `Promise<Blob>` | Serializes the workbook to a `Blob` with the `.xlsx` MIME type |
| `closeAsync()` | `Promise<void>` | Closes the underlying zip archive and clears the cache |

---

## SdExcelWorksheet

Represents a single worksheet within a workbook. Provides access to rows, columns, and cells, as well as operations for data import/export, styling, merging, and image insertion.

```typescript
class SdExcelWorksheet {
  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _relId: number,
    private readonly _targetFileName: string,
  );

  async getNameAsync(): Promise<string>;
  async setNameAsync(newName: string): Promise<void>;
  row(r: number): SdExcelRow;
  cell(r: number, c: number): SdExcelCell;
  col(c: number): SdExcelCol;
  async getRangeAsync(): Promise<ISdExcelAddressRangePoint>;
  async getCellsAsync(): Promise<SdExcelCell[][]>;
  async getDataTableAsync(opt?: {
    headerRowIndex?: number;
    checkEndColIndex?: number;
    usableHeaderNameFn?: (headerName: string) => boolean;
  }): Promise<Record<string, any>[]>;
  async setDataMatrixAsync(matrix: TSdExcelValueType[][]): Promise<void>;
  async setRecords(record: Record<string, any>[]): Promise<void>;
  async setZoomAsync(percent: number): Promise<void>;
  async setFixAsync(point: { r?: number; c?: number }): Promise<void>;
  async copyRowStyleAsync(srcR: number, targetR: number): Promise<void>;
  async copyCellStyleAsync(
    srcAddr: { r: number; c: number },
    targetAddr: { r: number; c: number },
  ): Promise<void>;
  async copyRowAsync(srcR: number, targetR: number): Promise<void>;
  async copyCellAsync(
    srcAddr: { r: number; c: number },
    targetAddr: { r: number; c: number },
  ): Promise<void>;
  async insertEmptyRowAsync(row: number): Promise<void>;
  async insertCopyRowAsync(srcR: number, targetR: number): Promise<void>;
  async addImageAsync(opts: {
    buffer: Buffer;
    ext: string;
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to?: { r: number; c: number; rOff?: number | string; cOff?: number | string };
  }): Promise<void>;
  async addDrawingAsync(opts: {
    buffer: Buffer;
    ext: string;
    r: number;
    c: number;
    width: number;
    height: number;
    left?: number;
    top?: number;
  }): Promise<void>;
}
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getNameAsync()` | `Promise<string>` | Returns the worksheet name |
| `setNameAsync(newName)` | `Promise<void>` | Renames the worksheet |
| `row(r)` | `SdExcelRow` | Returns the row at zero-based index `r` |
| `cell(r, c)` | `SdExcelCell` | Returns the cell at zero-based row `r` and column `c` |
| `col(c)` | `SdExcelCol` | Returns the column at zero-based index `c` |
| `getRangeAsync()` | `Promise<ISdExcelAddressRangePoint>` | Returns the used range of the worksheet |
| `getCellsAsync()` | `Promise<SdExcelCell[][]>` | Returns a 2D array of all cells in the used range |
| `getDataTableAsync(opt?)` | `Promise<Record<string, any>[]>` | Reads the worksheet as a table. The first row (or `headerRowIndex`) is used as column headers. Returns an array of records keyed by header values |
| `setDataMatrixAsync(matrix)` | `Promise<void>` | Writes a 2D array of values starting at cell (0, 0) |
| `setRecords(record)` | `Promise<void>` | Writes an array of records. Headers are auto-generated from record keys at row 0, data starts at row 1 |
| `setZoomAsync(percent)` | `Promise<void>` | Sets the zoom level (e.g., `85` for 85%) |
| `setFixAsync(point)` | `Promise<void>` | Freezes rows/columns. `{ r: 0 }` freezes the first row, `{ c: 0 }` freezes the first column |
| `copyRowStyleAsync(srcR, targetR)` | `Promise<void>` | Copies cell styles from one row to another across all columns |
| `copyCellStyleAsync(srcAddr, targetAddr)` | `Promise<void>` | Copies the style from one cell to another |
| `copyRowAsync(srcR, targetR)` | `Promise<void>` | Copies an entire row (values, styles, merge cells) to a target row |
| `copyCellAsync(srcAddr, targetAddr)` | `Promise<void>` | Copies a single cell (value, style) to a target address |
| `insertEmptyRowAsync(row)` | `Promise<void>` | Inserts an empty row, shifting subsequent rows down by one |
| `insertCopyRowAsync(srcR, targetR)` | `Promise<void>` | Inserts a copy of `srcR` at `targetR`, shifting subsequent rows down |
| `addImageAsync(opts)` | `Promise<void>` | Inserts an image using a two-cell anchor (from/to positioning) |
| `addDrawingAsync(opts)` | `Promise<void>` | Inserts an image using a one-cell anchor with explicit pixel width/height |

### getDataTableAsync options

| Field | Type | Description |
|-------|------|-------------|
| `headerRowIndex` | `number \| undefined` | Zero-based row index for the header row. Defaults to the first row in the range |
| `checkEndColIndex` | `number \| undefined` | If set, stops reading when the cell at this column index is `undefined` |
| `usableHeaderNameFn` | `(headerName: string) => boolean \| undefined` | Filter function to include only specific header columns |

### addImageAsync options

| Field | Type | Description |
|-------|------|-------------|
| `buffer` | `Buffer` | Image file data |
| `ext` | `string` | File extension (e.g., `"png"`, `"jpg"`) |
| `from` | `{ r: number; c: number; rOff?: number \| string; cOff?: number \| string }` | Top-left anchor cell with optional row/column offsets |
| `to` | `{ r: number; c: number; rOff?: number \| string; cOff?: number \| string } \| undefined` | Bottom-right anchor cell. Defaults to one row and one column past `from` |

### addDrawingAsync options

| Field | Type | Description |
|-------|------|-------------|
| `buffer` | `Buffer` | Image file data |
| `ext` | `string` | File extension (e.g., `"png"`, `"jpg"`) |
| `r` | `number` | Zero-based row index for anchor |
| `c` | `number` | Zero-based column index for anchor |
| `width` | `number` | Image width in pixels |
| `height` | `number` | Image height in pixels |
| `left` | `number \| undefined` | Optional horizontal offset in pixels |
| `top` | `number \| undefined` | Optional vertical offset in pixels |

---

## SdExcelRow

Represents a single row within a worksheet.

```typescript
class SdExcelRow {
  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _r: number,
  );

  cell(c: number): SdExcelCell;
  async getCellsAsync(): Promise<SdExcelCell[]>;
}
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `cell(c)` | `SdExcelCell` | Returns the cell at zero-based column index `c` in this row |
| `getCellsAsync()` | `Promise<SdExcelCell[]>` | Returns all cells in this row across the used range |

---

## SdExcelCol

Represents a single column within a worksheet.

```typescript
class SdExcelCol {
  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _c: number,
  );

  cell(r: number): SdExcelCell;
  async getCellsAsync(): Promise<SdExcelCell[]>;
  async setWidthAsync(size: number): Promise<void>;
}
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `cell(r)` | `SdExcelCell` | Returns the cell at zero-based row index `r` in this column |
| `getCellsAsync()` | `Promise<SdExcelCell[]>` | Returns all cells in this column across the used range |
| `setWidthAsync(size)` | `Promise<void>` | Sets the column width |

---

## SdExcelCell

Represents a single cell within a worksheet. Supports reading/writing values, formulas, styles, and merge operations.

```typescript
class SdExcelCell {
  addr: { r: number; c: number };

  style: {
    setBackgroundAsync(color: string): Promise<void>;
    setBorderAsync(directions: ("left" | "right" | "top" | "bottom")[]): Promise<void>;
    setVerticalAlignAsync(align: "center" | "top" | "bottom"): Promise<void>;
    setHorizontalAlignAsync(align: "center" | "left" | "right"): Promise<void>;
    setFormatPresetAsync(
      format: TSdExcelNumberFormat | "ThousandsSeparator" | "0%" | "0.00%",
    ): Promise<void>;
    setNumFormatIdAsync(numFmtId: string): Promise<void>;
    setNumFormatCodeAsync(numFmtCode: string): Promise<void>;
  };

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _r: number,
    private readonly _c: number,
  );

  async setValAsync(val: TSdExcelValueType): Promise<void>;
  async getValAsync(): Promise<TSdExcelValueType>;
  async setFormulaAsync(val: string | undefined): Promise<void>;
  async mergeAsync(r: number, c: number): Promise<void>;
  async getStyleIdAsync(): Promise<string | undefined>;
  async setStyleIdAsync(styleId: string | undefined): Promise<void>;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `addr` | `{ r: number; c: number }` | The zero-based row and column address of this cell |
| `style` | `object` | Style helper object with async methods for background, border, alignment, and number formatting |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `setValAsync(val)` | `Promise<void>` | Sets the cell value. Supports `string`, `number`, `boolean`, `DateOnly`, `DateTime`, `Time`, and `undefined` (clears the cell) |
| `getValAsync()` | `Promise<TSdExcelValueType>` | Reads the cell value, automatically converting based on the cell type and number format |
| `setFormulaAsync(val)` | `Promise<void>` | Sets or clears a formula. Pass `undefined` to clear |
| `mergeAsync(r, c)` | `Promise<void>` | Merges this cell with the cell at `(r, c)`. This cell becomes the top-left of the merged range |
| `getStyleIdAsync()` | `Promise<string \| undefined>` | Returns the internal style ID of this cell |
| `setStyleIdAsync(styleId)` | `Promise<void>` | Sets or clears the internal style ID |

### Style methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `style.setBackgroundAsync(color)` | `color: string` — 8-character hex `AARRGGBB` | Sets the background fill color |
| `style.setBorderAsync(directions)` | `directions: ("left" \| "right" \| "top" \| "bottom")[]` | Sets thin borders on the specified sides |
| `style.setVerticalAlignAsync(align)` | `align: "center" \| "top" \| "bottom"` | Sets vertical alignment |
| `style.setHorizontalAlignAsync(align)` | `align: "center" \| "left" \| "right"` | Sets horizontal alignment |
| `style.setFormatPresetAsync(format)` | `format: TSdExcelNumberFormat \| "ThousandsSeparator" \| "0%" \| "0.00%"` | Applies a preset number format |
| `style.setNumFormatIdAsync(numFmtId)` | `numFmtId: string` | Sets a raw number format ID |
| `style.setNumFormatCodeAsync(numFmtCode)` | `numFmtCode: string` | Sets a custom number format code (e.g., `"#,##0.00"`) |
