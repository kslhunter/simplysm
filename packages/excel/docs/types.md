# Types

All type exports from the excel package.

```typescript
import type {
  ExcelValueType,
  ExcelNumberFormat,
  ExcelCellType,
  ExcelAddressPoint,
  ExcelAddressRangePoint,
  ExcelStyleOptions,
  ExcelBorderPosition,
  ExcelHorizontalAlign,
  ExcelVerticalAlign,
  ExcelXml,
  // XML data types (internal)
  ExcelXmlContentTypeData,
  ExcelXmlRelationshipData,
  ExcelXmlWorkbookData,
  ExcelXmlWorksheetData,
  ExcelRowData,
  ExcelCellData,
  ExcelXmlDrawingData,
  ExcelXmlSharedStringData,
  ExcelXmlSharedStringDataSi,
  ExcelXmlSharedStringDataText,
  ExcelXmlStyleData,
  ExcelXmlStyleDataXf,
  ExcelXmlStyleDataFill,
  ExcelXmlStyleDataBorder,
} from "@simplysm/excel";
```

## Value Types

### `ExcelValueType`

Union of supported cell value types.

```typescript
type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
```

### `ExcelNumberFormat`

Number format name.

```typescript
type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

### `ExcelCellType`

Excel cell type identifier.

```typescript
type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";
```

- `s` -- shared string (SharedString)
- `b` -- boolean
- `str` -- formula result string
- `n` -- number
- `inlineStr` -- inline string (rich text)
- `e` -- error

## Address Types

### `ExcelAddressPoint`

Cell coordinate (0-based).

```typescript
interface ExcelAddressPoint {
  r: number;
  c: number;
}
```

### `ExcelAddressRangePoint`

Range of cell coordinates (start and end).

```typescript
interface ExcelAddressRangePoint {
  s: ExcelAddressPoint;
  e: ExcelAddressPoint;
}
```

## Style Types

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

### `ExcelStyleOptions`

Cell style options.

```typescript
interface ExcelStyleOptions {
  /** Background color (ARGB format, e.g. "00FF0000") */
  background?: string;
  /** Border positions */
  border?: ExcelBorderPosition[];
  /** Horizontal alignment */
  horizontalAlign?: ExcelHorizontalAlign;
  /** Vertical alignment */
  verticalAlign?: ExcelVerticalAlign;
  /** Number format */
  numberFormat?: ExcelNumberFormat;
}
```

**Example:**
```typescript
await cell.setStyle({
  background: "00FF0000",
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
  verticalAlign: "center",
  numberFormat: "number",
});
```

## Excel XML Interface

### `ExcelXml`

```typescript
interface ExcelXml {
  readonly data: unknown;
  cleanup(): void;
}
```

## XML Data Types

These types represent the internal XML structure of `.xlsx` files. They are used internally by the library but exported for advanced use cases.

### `ExcelXmlContentTypeData`

Content type definitions (`[Content_Types].xml`).

```typescript
interface ExcelXmlContentTypeData {
  Types: {
    $: { xmlns: string };
    Default: { $: { Extension: string; ContentType: string } }[];
    Override: { $: { PartName: string; ContentType: string } }[];
  };
}
```

### `ExcelXmlRelationshipData`

Relationship definitions (`.rels` files).

```typescript
interface ExcelXmlRelationshipData {
  Relationships: {
    $: { xmlns: string };
    Relationship?: ExcelRelationshipData[];
  };
}
```

### `ExcelXmlWorkbookData`

Workbook XML data.

```typescript
interface ExcelXmlWorkbookData {
  workbook: {
    $: { "xmlns": string; "xmlns:r"?: string };
    bookViews?: [{ workbookView: [{}] }];
    sheets?: [{ sheet: { $: { "name": string; "sheetId": string; "r:id": string } }[] }];
  };
}
```

### `ExcelXmlWorksheetData`

Worksheet XML data. Contains sheet data, dimensions, views, columns, merge cells, and drawing references.

### `ExcelRowData`

```typescript
interface ExcelRowData {
  $: { r: string }; // row address (1-based)
  c?: ExcelCellData[];
}
```

### `ExcelCellData`

```typescript
interface ExcelCellData {
  $: {
    r: string;          // cell address (e.g. "A1")
    s?: string;         // styleId
    t?: ExcelCellType;  // type
  };
  v?: [string];          // value
  f?: [string];          // formula
  is?: { t?: (string | { _?: string })[] }[];  // inline string
}
```

### `ExcelXmlDrawingData`

Drawing XML data (embedded images).

### `ExcelXmlSharedStringData`

Shared strings table.

```typescript
interface ExcelXmlSharedStringData {
  sst: {
    $: { xmlns: string };
    si?: ExcelXmlSharedStringDataSi[];
  };
}
```

### `ExcelXmlSharedStringDataSi`

```typescript
type ExcelXmlSharedStringDataSi =
  | { t: ExcelXmlSharedStringDataText }
  | { r: { t: ExcelXmlSharedStringDataText }[] };
```

### `ExcelXmlSharedStringDataText`

```typescript
type ExcelXmlSharedStringDataText = [
  string | { $: { space?: "preserve" }; _?: string },
];
```

### `ExcelXmlStyleData`

Style definitions (styles.xml). Contains number formats, fonts, fills, borders, and cell formats.

### `ExcelXmlStyleDataXf`

Cell format definition.

```typescript
interface ExcelXmlStyleDataXf {
  $: {
    numFmtId?: string;
    fontId?: string;
    fillId?: string;
    borderId?: string;
    xfId?: string;
    applyNumberFormat?: string;
    applyFont?: string;
    applyAlignment?: string;
    applyFill?: string;
    applyBorder?: string;
  };
  alignment?: [{ $: { horizontal?: "center" | "left" | "right"; vertical?: "center" | "top" | "bottom" } }];
}
```

### `ExcelXmlStyleDataFill`

Fill style definition.

```typescript
interface ExcelXmlStyleDataFill {
  patternFill: [{ $: { patternType: "none" | "solid" | "gray125" }; fgColor?: [{ $: { rgb: string } }] }];
}
```

### `ExcelXmlStyleDataBorder`

Border style definition. Each side (`top`, `left`, `right`, `bottom`) has `style` (`"thin"` | `"medium"`) and optional `color`.
