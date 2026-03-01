# Types

## Value Types

### `ExcelValueType`

Union of all supported cell value types.

```typescript
type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
```

### `ExcelNumberFormat`

Named number format for a cell.

```typescript
type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

### `ExcelCellType`

Raw Excel cell type code stored in the XML.

```typescript
// "s"         - shared string
// "b"         - boolean
// "str"       - formula result string
// "n"         - number
// "inlineStr" - inline string (rich text)
// "e"         - error
type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";
```

---

## Address Types

### `ExcelAddressPoint`

A 0-based row/column coordinate pair.

```typescript
interface ExcelAddressPoint {
  r: number; // 0-based row index
  c: number; // 0-based column index
}
```

### `ExcelAddressRangePoint`

A range defined by start and end `ExcelAddressPoint` values.

```typescript
interface ExcelAddressRangePoint {
  s: ExcelAddressPoint; // start (top-left)
  e: ExcelAddressPoint; // end (bottom-right)
}
```

---

## Style Types

### `ExcelStyleOptions`

Options for `ExcelCell.setStyle()`.

```typescript
interface ExcelStyleOptions {
  background?: string;                   // ARGB 8-digit hex, e.g. "FFFF0000" (red)
  border?: ExcelBorderPosition[];        // Border sides to draw
  horizontalAlign?: ExcelHorizontalAlign;
  verticalAlign?: ExcelVerticalAlign;
  numberFormat?: ExcelNumberFormat;
}
```

### `ExcelBorderPosition`

```typescript
type ExcelBorderPosition = "left" | "right" | "top" | "bottom";
```

### `ExcelHorizontalAlign`

```typescript
type ExcelHorizontalAlign = "center" | "left" | "right";
```

### `ExcelVerticalAlign`

```typescript
type ExcelVerticalAlign = "center" | "top" | "bottom";
```

---

## XML Data Types

These interfaces represent the raw XML structures parsed from the `.xlsx` ZIP package. They are exported for advanced use cases (e.g., directly reading the parsed XML tree).

| Interface / Type | Description |
|-----------------|-------------|
| `ExcelXmlContentTypeData` | `[Content_Types].xml` document structure |
| `ExcelXmlRelationshipData` | `.rels` relationship file structure |
| `ExcelRelationshipData` | A single relationship entry |
| `ExcelXmlWorkbookData` | `xl/workbook.xml` document structure |
| `ExcelXmlWorksheetData` | `xl/worksheets/sheetN.xml` document structure |
| `ExcelRowData` | A row element within worksheet XML |
| `ExcelCellData` | A cell element within worksheet XML |
| `ExcelXmlDrawingData` | Drawing XML structure (`xl/drawings/drawingN.xml`) |
| `ExcelXmlSharedStringData` | Shared strings XML structure |
| `ExcelXmlSharedStringDataSi` | A shared string entry (plain or rich text) |
| `ExcelXmlSharedStringDataText` | Text content within a shared string entry |
| `ExcelXmlStyleData` | Styles XML document structure |
| `ExcelXmlStyleDataXf` | A cell format (`xf`) entry |
| `ExcelXmlStyleDataFill` | A fill entry |
| `ExcelXmlStyleDataBorder` | A border entry |
| `ExcelXml` | Interface implemented by all XML handler classes |
