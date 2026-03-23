# XML

Low-level classes that represent individual XML files inside an `.xlsx` archive. All classes implement the `ISdExcelXml` interface.

## SdExcelXmlWorkbook

Represents `xl/workbook.xml`. Manages the sheet list and workbook-level views.

```typescript
class SdExcelXmlWorkbook implements ISdExcelXml {
  data: ISdExcelXmlWorkbookData;

  constructor(data?: ISdExcelXmlWorkbookData);

  get lastWsRelId(): number | undefined;
  get sheetNames(): string[];

  addWorksheet(name: string): this;
  initializeView(): void;
  getWsRelIdByName(name: string): number | undefined;
  getWsRelIdByIndex(index: number): number | undefined;
  getWorksheetNameById(id: number): string | undefined;
  setWorksheetNameById(id: number, newName: string): void;
  cleanup(): void;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | `ISdExcelXmlWorkbookData` | The raw XML data structure |
| `lastWsRelId` | `number \| undefined` | The highest worksheet relationship ID currently in use |
| `sheetNames` | `string[]` | List of all sheet names |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `addWorksheet(name)` | `this` | Adds a new worksheet entry. Invalid characters (`:\/?*[]'`) are replaced with `_` |
| `initializeView()` | `void` | Ensures `bookViews` is initialized (required for zoom/freeze) |
| `getWsRelIdByName(name)` | `number \| undefined` | Returns the relationship ID for the sheet with the given name |
| `getWsRelIdByIndex(index)` | `number \| undefined` | Returns the relationship ID for the sheet at the given zero-based index |
| `getWorksheetNameById(id)` | `string \| undefined` | Returns the sheet name for the given relationship ID |
| `setWorksheetNameById(id, newName)` | `void` | Renames the sheet with the given relationship ID |
| `cleanup()` | `void` | Reorders XML elements to ensure correct serialization order |

---

## SdExcelXmlWorksheet

Represents `xl/worksheets/sheetN.xml`. Manages cell data, merge cells, column widths, zoom, and freeze panes.

```typescript
class SdExcelXmlWorksheet implements ISdExcelXml {
  data: ISdExcelXmlWorksheetData;

  constructor(data?: ISdExcelXmlWorksheetData);

  get range(): ISdExcelAddressRangePoint;

  setCellType(addr: { r: number; c: number }, type: "s" | "b" | "str" | undefined): void;
  getCellType(addr: { r: number; c: number }): string | undefined;
  setCellVal(addr: { r: number; c: number }, val: string | undefined): void;
  getCellVal(addr: { r: number; c: number }): string | undefined;
  setCellFormula(addr: { r: number; c: number }, val: string | undefined): void;
  getCellFormula(addr: { r: number; c: number }): string | undefined;
  getCellStyleId(addr: { r: number; c: number }): string | undefined;
  setCellStyleId(addr: { r: number; c: number }, styleId: string | undefined): void;
  deleteCell(addr: { r: number; c: number }): void;
  clearCellValue(addr: { r: number; c: number }): void;
  setMergeCells(
    startAddr: { r: number; c: number },
    endAddr: { r: number; c: number },
  ): void;
  getMergeCells(): { s: { r: number; c: number }; e: { r: number; c: number } }[];
  removeMergeCells(
    fromAddr: { r: number; c: number },
    toAddr: { r: number; c: number },
  ): void;
  setColWidth(colIndex: string, width: string): void;
  setZoom(percent: number): void;
  setFix(point: { r?: number; c?: number }): void;
  insertEmptyRow(row: number): void;
  copyRow(sourceR: number, targetR: number): void;
  copyCell(
    sourceAddr: { r: number; c: number },
    targetAddr: { r: number; c: number },
  ): void;
  cleanup(): void;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | `ISdExcelXmlWorksheetData` | The raw XML data structure |
| `range` | `ISdExcelAddressRangePoint` | Computed used range based on actual row/cell data |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `setCellType(addr, type)` | `void` | Sets the cell type attribute (`"s"` = shared string, `"b"` = boolean, `"str"` = formula string, `undefined` = number) |
| `getCellType(addr)` | `string \| undefined` | Returns the cell type attribute |
| `setCellVal(addr, val)` | `void` | Sets the raw cell value string. Pass `undefined` to clear |
| `getCellVal(addr)` | `string \| undefined` | Returns the raw cell value string, including inline strings |
| `setCellFormula(addr, val)` | `void` | Sets or clears a cell formula |
| `getCellFormula(addr)` | `string \| undefined` | Returns the cell formula string |
| `getCellStyleId(addr)` | `string \| undefined` | Returns the style ID applied to the cell |
| `setCellStyleId(addr, styleId)` | `void` | Sets or clears the style ID on a cell |
| `deleteCell(addr)` | `void` | Removes a cell entirely. If the row becomes empty, the row is also removed |
| `clearCellValue(addr)` | `void` | Clears cell value, formula, and inline string, but preserves the style |
| `setMergeCells(startAddr, endAddr)` | `void` | Merges cells in the given range. Throws if overlapping with existing merges. Clears values in non-anchor cells |
| `getMergeCells()` | `Array<{ s, e }>` | Returns all merged cell ranges |
| `removeMergeCells(fromAddr, toAddr)` | `void` | Removes merged ranges that fall entirely within the given bounds |
| `setColWidth(colIndex, width)` | `void` | Sets the width for a 1-based column index string |
| `setZoom(percent)` | `void` | Sets the zoom scale percentage |
| `setFix(point)` | `void` | Sets frozen panes at the given row/column |
| `insertEmptyRow(row)` | `void` | Inserts an empty row, shifting rows at or after `row` down by one. Also adjusts merge cell ranges |
| `copyRow(sourceR, targetR)` | `void` | Deep-clones a row (data + merges) to a target row, replacing any existing content |
| `copyCell(sourceAddr, targetAddr)` | `void` | Deep-clones a single cell to a target address |
| `cleanup()` | `void` | Reorders XML elements, sorts rows/cells, and updates the dimension reference |

---

## SdExcelXmlStyle

Represents `xl/styles.xml`. Manages fonts, fills, borders, number formats, and cell XF (format) entries.

```typescript
class SdExcelXmlStyle implements ISdExcelXml {
  data: ISdExcelXmlStyleData;

  constructor(data?: ISdExcelXmlStyleData);

  add(style: ISdExcelStyle): string;
  addWithClone(id: string, style: ISdExcelStyle): string;
  get(id: string): ISdExcelStyle;
  getNumFmtCode(numFmtId: string): string | undefined;
  cleanup(): void;
}
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `add(style)` | `string` | Creates a new cell XF entry from the given style. Returns the style ID (index). Reuses existing entries if an identical one already exists |
| `addWithClone(id, style)` | `string` | Clones the existing style at `id` and applies the given overrides. Returns the new style ID |
| `get(id)` | `ISdExcelStyle` | Returns the style descriptor for the given style ID |
| `getNumFmtCode(numFmtId)` | `string \| undefined` | Returns the custom format code for the given number format ID |
| `cleanup()` | `void` | Reorders XML elements so `numFmts` appears first |

---

## ISdExcelStyle

Style descriptor interface used by `SdExcelXmlStyle.add()` and `addWithClone()`.

```typescript
export interface ISdExcelStyle {
  numFmtId?: string;
  numFmtCode?: string;
  border?: ("left" | "right" | "top" | "bottom")[];
  background?: string;
  verticalAlign?: "center" | "top" | "bottom";
  horizontalAlign?: "center" | "left" | "right";
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `numFmtId` | `string \| undefined` | Built-in or custom number format ID |
| `numFmtCode` | `string \| undefined` | Custom number format code (e.g., `"#,##0.00"`). When set, a custom numFmt entry is created |
| `border` | `("left" \| "right" \| "top" \| "bottom")[] \| undefined` | Border directions to apply with thin style |
| `background` | `string \| undefined` | Background fill color in `AARRGGBB` hex format |
| `verticalAlign` | `"center" \| "top" \| "bottom" \| undefined` | Vertical cell alignment |
| `horizontalAlign` | `"center" \| "left" \| "right" \| undefined` | Horizontal cell alignment |

---

## SdExcelXmlContentType

Represents `[Content_Types].xml`. Registers MIME content types for parts in the archive.

```typescript
class SdExcelXmlContentType implements ISdExcelXml {
  data: ISdExcelXmlContentTypeData;

  constructor(data?: ISdExcelXmlContentTypeData);

  add(partName: string, contentType: string): this;
  cleanup(): void;
}
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `add(partName, contentType)` | `this` | Registers a content type override for the given part path. Skips if already registered |
| `cleanup()` | `void` | No-op |

---

## SdExcelXmlRelationShip

Represents `.rels` files (e.g., `_rels/.rels`, `xl/_rels/workbook.xml.rels`). Manages relationship entries that link parts within the archive.

```typescript
class SdExcelXmlRelationShip implements ISdExcelXml {
  data: ISdExcelXmlRelationshipData;

  constructor(data?: ISdExcelXmlRelationshipData);

  getTargetByRelId(rId: number): string | undefined;
  add(target: string, type: string): this;
  addAndGetId(target: string, type: string): number;
  insert(rId: number, target: string, type: string): this;
  cleanup(): void;
}
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getTargetByRelId(rId)` | `string \| undefined` | Returns the target path for the given numeric relationship ID |
| `add(target, type)` | `this` | Appends a new relationship with auto-incremented ID. Returns `this` for chaining |
| `addAndGetId(target, type)` | `number` | Appends a new relationship and returns its numeric ID |
| `insert(rId, target, type)` | `this` | Inserts a relationship at a specific ID, shifting existing IDs >= `rId` up by one |
| `cleanup()` | `void` | No-op |

---

## SdExcelXmlDrawing

Represents `xl/drawings/drawingN.xml`. Manages picture anchors for embedded images.

```typescript
class SdExcelXmlDrawing implements ISdExcelXml {
  data: ISdExcelXmlDrawingData;

  constructor(data?: ISdExcelXmlDrawingData);

  addPicture(opts: {
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    blipRelId: string;
  }): void;

  addOneCellPicture(opts: {
    r: number;
    c: number;
    width: number;
    height: number;
    left?: number;
    top?: number;
    blipRelId: string;
  }): void;

  cleanup(): void;
}
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `addPicture(opts)` | `void` | Adds a picture using a `twoCellAnchor` (from/to cell positioning). `blipRelId` references the image relationship |
| `addOneCellPicture(opts)` | `void` | Adds a picture using a `oneCellAnchor` with explicit pixel dimensions (converted to EMUs at 9525 EMU/px). `left`/`top` are optional pixel offsets |
| `cleanup()` | `void` | No-op |

### addPicture options

| Field | Type | Description |
|-------|------|-------------|
| `from` | `{ r: number; c: number; rOff?: number \| string; cOff?: number \| string }` | Top-left anchor cell with optional row/column offsets |
| `to` | `{ r: number; c: number; rOff?: number \| string; cOff?: number \| string }` | Bottom-right anchor cell with optional row/column offsets |
| `blipRelId` | `string` | Relationship ID referencing the embedded image (e.g., `"rId1"`) |

### addOneCellPicture options

| Field | Type | Description |
|-------|------|-------------|
| `r` | `number` | Zero-based row for anchor |
| `c` | `number` | Zero-based column for anchor |
| `width` | `number` | Image width in pixels |
| `height` | `number` | Image height in pixels |
| `left` | `number \| undefined` | Horizontal offset in pixels |
| `top` | `number \| undefined` | Vertical offset in pixels |
| `blipRelId` | `string` | Relationship ID referencing the embedded image |

---

## SdExcelXmlSharedString

Represents `xl/sharedStrings.xml`. Manages the shared string table for deduplication of string values.

```typescript
class SdExcelXmlSharedString implements ISdExcelXml {
  data: ISdExcelXmlSharedStringData;

  constructor(data?: ISdExcelXmlSharedStringData);

  getIdByString(str: string): number | undefined;
  getStringById(id: number): string | undefined;
  add(str: string): number;
  cleanup(): void;
}
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getIdByString(str)` | `number \| undefined` | Returns the shared string index for the given string, or `undefined` if not found |
| `getStringById(id)` | `string \| undefined` | Returns the string at the given shared string index |
| `add(str)` | `number` | Adds a new string to the shared string table and returns its index |
| `cleanup()` | `void` | No-op |

---

## SdExcelXmlUnknown

Fallback wrapper for XML files that do not match any known type (e.g., `xl/theme/theme1.xml`).

```typescript
class SdExcelXmlUnknown implements ISdExcelXml {
  constructor(public readonly data: Record<string, any>);

  cleanup(): void;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | `Record<string, any>` | The raw parsed XML data |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `cleanup()` | `void` | No-op |
