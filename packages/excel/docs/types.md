# Types

Types and enums for Excel file processing.

## XML Data Types

Internal XML structure types used by the library to represent .xlsx file contents.

### ExcelXmlContentTypeData

Represents `[Content_Types].xml` in the .xlsx archive.

| Field | Type | Description |
|---|---|---|
| `Types.$` | `{ xmlns: string }` | XML namespace |
| `Types.Default` | `Array<{ $: { Extension: string; ContentType: string } }>` | Default content type mappings by file extension |
| `Types.Override` | `Array<{ $: { PartName: string; ContentType: string } }>` | Override content type mappings by part name |

### ExcelXmlRelationshipData

Represents a `_rels/*.rels` relationship file.

| Field | Type | Description |
|---|---|---|
| `Relationships.$` | `{ xmlns: string }` | XML namespace |
| `Relationships.Relationship?` | `ExcelRelationshipData[]` | Array of relationship entries |

### ExcelRelationshipData

A single relationship entry.

| Field | Type | Description |
|---|---|---|
| `$.Id` | `string` | Relationship ID (e.g., "rId1") |
| `$.Target` | `string` | Target path |
| `$.Type` | `string` | Relationship type URI |

### ExcelXmlWorkbookData

Represents `xl/workbook.xml`.

| Field | Type | Description |
|---|---|---|
| `workbook.$` | `{ xmlns: string; "xmlns:r"?: string }` | XML namespaces |
| `workbook.bookViews?` | `[{ workbookView: [{}] }]` | Workbook view settings |
| `workbook.sheets?` | `[{ sheet: Array<{ $: { name: string; sheetId: string; "r:id": string } }> }]` | Sheet definitions |

### ExcelXmlWorksheetData

Represents `xl/worksheets/sheet*.xml`.

| Field | Type | Description |
|---|---|---|
| `worksheet.$` | `{ xmlns: string; "xmlns:r"?: string }` | XML namespaces |
| `worksheet.dimension?` | `[{ $: { ref: string } }]` | Used range reference (e.g., "A1:C10") |
| `worksheet.sheetViews?` | See source | Sheet view settings (zoom, freeze panes) |
| `worksheet.sheetFormatPr?` | `[{ $: { defaultRowHeight: string } }]` | Default row height |
| `worksheet.cols?` | `[{ col: Array<{ $: { min: string; max: string; width?: string; bestFit?: string; customWidth?: string } }> }]` | Column width definitions |
| `worksheet.sheetData` | `[{ row?: ExcelRowData[] }]` | Row data (required) |
| `worksheet.mergeCells?` | `[{ $: { count: string }; mergeCell: Array<{ $: { ref: string } }> }]` | Merged cell ranges |
| `worksheet.drawing?` | `Array<{ $: { "r:id": string } }>` | Drawing references |

### ExcelRowData

A single row in worksheet data.

| Field | Type | Description |
|---|---|---|
| `$.r` | `string` | Row address (1-based, e.g., "1") |
| `c?` | `ExcelCellData[]` | Cell data array |

### ExcelCellData

A single cell in row data.

| Field | Type | Description |
|---|---|---|
| `$.r` | `string` | Cell address (e.g., "A1") |
| `$.s?` | `string` | Style ID |
| `$.t?` | `ExcelCellType` | Cell type |
| `v?` | `[string]` | Cell value |
| `f?` | `[string]` | Cell formula |
| `is?` | `Array<{ t?: (string \| { _?: string })[] }>` | Inline string data |

### ExcelXmlDrawingData

Represents `xl/drawings/drawing*.xml`.

| Field | Type | Description |
|---|---|---|
| `wsDr.$` | `{ xmlns: string; "xmlns:a"?: string; "xmlns:r"?: string }` | XML namespaces |
| `wsDr.twoCellAnchor?` | Array | Two-cell anchor picture definitions (from/to coordinates, picture properties, blip fill) |

### ExcelXmlSharedStringData

Represents `xl/sharedStrings.xml`.

| Field | Type | Description |
|---|---|---|
| `sst.$` | `{ xmlns: string }` | XML namespace |
| `sst.si?` | `ExcelXmlSharedStringDataSi[]` | Shared string items |

### ExcelXmlSharedStringDataSi

```typescript
type ExcelXmlSharedStringDataSi =
  | { t: ExcelXmlSharedStringDataText }
  | { r: { t: ExcelXmlSharedStringDataText }[] };
```

Either a plain text item (`t`) or a rich text item (`r`) with multiple runs.

### ExcelXmlSharedStringDataText

```typescript
type ExcelXmlSharedStringDataText = [string | { $: { space?: "preserve" }; _?: string }];
```

A single-element tuple: either a plain string or an object with optional space-preservation attribute.

### ExcelXmlStyleData

Represents `xl/styles.xml`.

| Field | Type | Description |
|---|---|---|
| `styleSheet.$` | `{ xmlns: string }` | XML namespace |
| `styleSheet.numFmts?` | `[{ $: { count: string }; numFmt?: Array<{ $: { numFmtId: string; formatCode: string } }> }]` | Number format definitions |
| `styleSheet.fonts` | `[{ $: { count: string }; font: {}[] }]` | Font definitions |
| `styleSheet.fills` | `[{ $: { count: string }; fill: ExcelXmlStyleDataFill[] }]` | Fill definitions |
| `styleSheet.borders` | `[{ $: { count: string }; border: ExcelXmlStyleDataBorder[] }]` | Border definitions |
| `styleSheet.cellXfs` | `[{ $: { count: string }; xf: ExcelXmlStyleDataXf[] }]` | Cell format definitions |

### ExcelXmlStyleDataXf

| Field | Type | Description |
|---|---|---|
| `$.numFmtId?` | `string` | Number format ID |
| `$.fontId?` | `string` | Font ID |
| `$.fillId?` | `string` | Fill ID |
| `$.borderId?` | `string` | Border ID |
| `$.xfId?` | `string` | Parent xf ID |
| `$.applyNumberFormat?` | `string` | Whether number format is applied |
| `$.applyFont?` | `string` | Whether font is applied |
| `$.applyAlignment?` | `string` | Whether alignment is applied |
| `$.applyFill?` | `string` | Whether fill is applied |
| `$.applyBorder?` | `string` | Whether border is applied |
| `alignment?` | `[{ $: { horizontal?: "center" \| "left" \| "right"; vertical?: "center" \| "top" \| "bottom" } }]` | Alignment settings |

### ExcelXmlStyleDataFill

| Field | Type | Description |
|---|---|---|
| `patternFill` | `[{ $: { patternType: "none" \| "solid" \| "gray125" }; fgColor?: [{ $: { rgb: string } }] }]` | Pattern fill with optional foreground color (ARGB) |

### ExcelXmlStyleDataBorder

| Field | Type | Description |
|---|---|---|
| `top?` | `[{ $: { style: "thin" \| "medium" }; color?: [{ $: { rgb: string } }] }]` | Top border |
| `left?` | `[{ $: { style: "thin" \| "medium" }; color?: [{ $: { rgb: string } }] }]` | Left border |
| `right?` | `[{ $: { style: "thin" \| "medium" }; color?: [{ $: { rgb: string } }] }]` | Right border |
| `bottom?` | `[{ $: { style: "thin" \| "medium" }; color?: [{ $: { rgb: string } }] }]` | Bottom border |

## Value Types

### ExcelValueType

```typescript
type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
```

Union of all supported cell value types. `DateOnly`, `DateTime`, and `Time` are from `@simplysm/core-common`.

### ExcelNumberFormat

```typescript
type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

Named number format categories for cell formatting.

### ExcelCellType

```typescript
type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";
```

| Value | Description |
|---|---|
| `"s"` | Shared string |
| `"b"` | Boolean |
| `"str"` | Formula result string |
| `"n"` | Number |
| `"inlineStr"` | Inline string (rich text) |
| `"e"` | Error |

## Address Types

### ExcelAddressPoint

A cell coordinate (0-based).

| Field | Type | Description |
|---|---|---|
| `r` | `number` | Row index (0-based) |
| `c` | `number` | Column index (0-based) |

### ExcelAddressRangePoint

A rectangular cell range.

| Field | Type | Description |
|---|---|---|
| `s` | `ExcelAddressPoint` | Start (top-left) coordinate |
| `e` | `ExcelAddressPoint` | End (bottom-right) coordinate |

## ExcelXml Interface

```typescript
interface ExcelXml {
  readonly data: unknown;
  cleanup(): void;
}
```

Internal interface for XML document wrappers.

| Member | Type | Description |
|---|---|---|
| `data` | `readonly unknown` | Raw XML data |
| `cleanup()` | `void` | Release resources |

## Style Types

### ExcelBorderPosition

```typescript
type ExcelBorderPosition = "left" | "right" | "top" | "bottom";
```

### ExcelHorizontalAlign

```typescript
type ExcelHorizontalAlign = "center" | "left" | "right";
```

### ExcelVerticalAlign

```typescript
type ExcelVerticalAlign = "center" | "top" | "bottom";
```

### ExcelStyleOptions

Cell style options.

| Field | Type | Description |
|---|---|---|
| `background?` | `string` | Background color in ARGB format (e.g., `"00FF0000"` for red) |
| `border?` | `ExcelBorderPosition[]` | Border positions to apply |
| `horizontalAlign?` | `ExcelHorizontalAlign` | Horizontal alignment |
| `verticalAlign?` | `ExcelVerticalAlign` | Vertical alignment |
| `numberFormat?` | `ExcelNumberFormat` | Number format |

