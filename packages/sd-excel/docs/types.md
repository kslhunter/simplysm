# Types

Interfaces, type aliases, and constants defining the internal XML data structures and shared types.

## ISdExcelXml

Base interface that all XML wrapper classes implement.

```typescript
export interface ISdExcelXml {
  readonly data: any;
  cleanup(): void;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `data` | `any` | The raw parsed XML data structure |
| `cleanup()` | `() => void` | Called before serialization to reorder elements and update computed fields |

---

## ISdExcelXmlContentTypeData

Data shape for `[Content_Types].xml`.

```typescript
export interface ISdExcelXmlContentTypeData {
  Types: {
    $: {
      xmlns: string;
    };
    Default: {
      $: {
        Extension: string;
        ContentType: string;
      };
    }[];
    Override: {
      $: {
        PartName: string;
        ContentType: string;
      };
    }[];
  };
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `Types.$` | `{ xmlns: string }` | XML namespace attributes |
| `Types.Default` | `Array<{ $: { Extension, ContentType } }>` | Default content type mappings by file extension |
| `Types.Override` | `Array<{ $: { PartName, ContentType } }>` | Part-specific content type overrides |

---

## ISdExcelXmlRelationshipData

Data shape for `.rels` files.

```typescript
export interface ISdExcelXmlRelationshipData {
  Relationships: {
    $: {
      xmlns: string;
    };
    Relationship?: ISdExcelRelationshipData[];
  };
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `Relationships.$` | `{ xmlns: string }` | XML namespace attributes |
| `Relationships.Relationship` | `ISdExcelRelationshipData[] \| undefined` | Array of relationship entries |

---

## ISdExcelRelationshipData

Single relationship entry within a `.rels` file.

```typescript
export interface ISdExcelRelationshipData {
  $: {
    Id: string;
    Target: string;
    Type: string;
  };
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `$.Id` | `string` | Relationship ID (e.g., `"rId1"`) |
| `$.Target` | `string` | Target path (e.g., `"worksheets/sheet1.xml"`) |
| `$.Type` | `string` | Relationship type URI |

---

## ISdExcelXmlWorkbookData

Data shape for `xl/workbook.xml`.

```typescript
export interface ISdExcelXmlWorkbookData {
  workbook: {
    $: {
      "xmlns": string;
      "xmlns:r"?: string;
    };
    bookViews?: [
      {
        workbookView: [{}];
      },
    ];
    sheets?: [
      {
        sheet: {
          $: {
            "name": string;
            "sheetId": string;
            "r:id": string;
          };
        }[];
      },
    ];
  };
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `workbook.$` | `{ xmlns, "xmlns:r"? }` | XML namespace attributes |
| `workbook.bookViews` | `[{ workbookView: [{}] }] \| undefined` | Workbook view settings (required for zoom/freeze features) |
| `workbook.sheets` | `[{ sheet: Array<{ $: { name, sheetId, "r:id" } }> }] \| undefined` | Sheet list with name, sheet ID, and relationship ID for each sheet |

---

## ISdExcelXmlWorksheetData

Data shape for `xl/worksheets/sheetN.xml`.

```typescript
export interface ISdExcelXmlWorksheetData {
  worksheet: {
    $: { "xmlns": string; "xmlns:r"?: string };
    dimension?: [{ $: { ref: string } }];
    sheetViews?: [
      {
        sheetView: {
          $: { workbookViewId: string; zoomScale?: string };
          pane?: [
            {
              $: {
                xSplit?: string;
                ySplit?: string;
                topLeftCell?: string;
                activePane?: string;
                state?: string;
              };
            },
          ];
        }[];
      },
    ];
    sheetFormatPr?: [{ $: { defaultRowHeight: string } }];
    cols?: [
      {
        col: {
          $: {
            min: string;
            max: string;
            width?: string;
            bestFit?: string;
            customWidth?: string;
          };
        }[];
      },
    ];
    sheetData: [{ row?: ISdExcelRowData[] }];
    mergeCells?: [
      {
        $: { count: string };
        mergeCell: { $: { ref: string } }[];
      },
    ];
    drawing?: { $: { "r:id": string } }[];
  };
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `worksheet.$` | `{ xmlns, "xmlns:r"? }` | XML namespace attributes |
| `worksheet.dimension` | `[{ $: { ref } }] \| undefined` | Used range reference (e.g., `"A1:C10"`) |
| `worksheet.sheetViews` | `[{ sheetView: [...] }] \| undefined` | View settings including zoom scale and freeze panes |
| `worksheet.sheetViews[0].sheetView[0].$.zoomScale` | `string \| undefined` | Zoom percentage as string |
| `worksheet.sheetViews[0].sheetView[0].pane` | `[{ $: { xSplit?, ySplit?, topLeftCell?, activePane?, state? } }] \| undefined` | Freeze pane configuration |
| `worksheet.sheetFormatPr` | `[{ $: { defaultRowHeight } }] \| undefined` | Default row height |
| `worksheet.cols` | `[{ col: [...] }] \| undefined` | Column width definitions |
| `worksheet.sheetData` | `[{ row?: ISdExcelRowData[] }]` | Row data container (always present) |
| `worksheet.mergeCells` | `[{ $: { count }, mergeCell: [...] }] \| undefined` | Merged cell ranges |
| `worksheet.drawing` | `Array<{ $: { "r:id" } }> \| undefined` | Drawing relationship references |

---

## ISdExcelRowData

Single row entry in sheet data.

```typescript
export interface ISdExcelRowData {
  $: {
    r: string;
  };
  c?: ISdExcelCellData[];
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `$.r` | `string` | 1-based row address (e.g., `"1"`, `"2"`) |
| `c` | `ISdExcelCellData[] \| undefined` | Array of cell entries in this row |

---

## ISdExcelCellData

Single cell entry in row data.

```typescript
export interface ISdExcelCellData {
  $: {
    r: string;
    s?: string;
    t?: string;
  };
  v?: [string];
  f?: [string];
  is?: {
    t?: {
      _?: string;
    }[];
  }[];
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `$.r` | `string` | Cell address (e.g., `"A1"`, `"B3"`) |
| `$.s` | `string \| undefined` | Style ID (index into `cellXfs`) |
| `$.t` | `string \| undefined` | Cell type: `"s"` (shared string), `"b"` (boolean), `"str"` (formula string), `"n"` (number), `"e"` (error), `"inlineStr"` (inline string), `undefined` (number) |
| `v` | `[string] \| undefined` | Cell value as single-element array |
| `f` | `[string] \| undefined` | Cell formula as single-element array |
| `is` | `Array<{ t?: Array<{ _?: string }> }> \| undefined` | Inline string data |

---

## ISdExcelXmlDrawingData

Data shape for `xl/drawings/drawingN.xml`.

```typescript
export interface ISdExcelXmlDrawingData {
  wsDr: {
    $: {
      "xmlns": string;
      "xmlns:a"?: string;
      "xmlns:r"?: string;
    };
    twoCellAnchor?: {
      from?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      to?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      pic?: { nvPicPr?: any[]; blipFill?: any[]; spPr?: any[] }[];
      clientData?: any[];
    }[];
    oneCellAnchor?: {
      from?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      ext?: { $: { cx: string; cy: string } }[];
      pic?: { nvPicPr?: any[]; blipFill?: any[]; spPr?: any[] }[];
      clientData?: any[];
    }[];
  };
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `wsDr.$` | `{ xmlns, "xmlns:a"?, "xmlns:r"? }` | XML namespace attributes |
| `wsDr.twoCellAnchor` | `Array \| undefined` | Two-cell anchors for images positioned by from/to cells |
| `wsDr.oneCellAnchor` | `Array \| undefined` | One-cell anchors for images positioned by a single cell plus extent |

---

## ISdExcelXmlSharedStringData

Data shape for `xl/sharedStrings.xml`.

```typescript
export interface ISdExcelXmlSharedStringData {
  sst: {
    $: { xmlns: string };
    si?: TSdExcelXmlSharedStringDataSi[];
  };
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `sst.$` | `{ xmlns: string }` | XML namespace attributes |
| `sst.si` | `TSdExcelXmlSharedStringDataSi[] \| undefined` | Array of shared string items |

---

## TSdExcelXmlSharedStringDataSi

Union type representing a shared string `<si>` element. Either a plain string (`{ t: ... }`) or a rich-text run (`{ r: [{ t: ... }, ...] }`).

```typescript
export type TSdExcelXmlSharedStringDataSi =
  | { t: TSdExcelXmlSharedStringData }
  | { r: { t: TSdExcelXmlSharedStringData }[] };
```

---

## TSdExcelXmlSharedStringData

Tuple type for shared string `<t>` elements. Either a plain string or an object with optional whitespace preservation.

```typescript
export type TSdExcelXmlSharedStringData = [
  | string
  | {
      $: { space?: "preserve" };
      _?: string;
    },
];
```

---

## ISdExcelXmlStyleData

Data shape for `xl/styles.xml`.

```typescript
export interface ISdExcelXmlStyleData {
  styleSheet: {
    $: { xmlns: string };
    numFmts?: [
      {
        $: { count: string };
        numFmt?: {
          $: { numFmtId: string; formatCode: string };
        }[];
      },
    ];
    fonts: [{ $: { count: string }; font: {}[] }];
    fills: [{ $: { count: string }; fill: ISdExcelXmlStyleDataFill[] }];
    borders: [{ $: { count: string }; border: ISdExcelXmlStyleDataBorder[] }];
    cellXfs: [{ $: { count: string }; xf: ISdExcelXmlStyleDataXf[] }];
  };
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `styleSheet.$` | `{ xmlns: string }` | XML namespace attributes |
| `styleSheet.numFmts` | `[{ $: { count }, numFmt?: [...] }] \| undefined` | Custom number format definitions |
| `styleSheet.fonts` | `[{ $: { count }, font: [...] }]` | Font definitions |
| `styleSheet.fills` | `[{ $: { count }, fill: [...] }]` | Fill definitions |
| `styleSheet.borders` | `[{ $: { count }, border: [...] }]` | Border definitions |
| `styleSheet.cellXfs` | `[{ $: { count }, xf: [...] }]` | Cell format (XF) entries that reference fonts, fills, borders, and number formats |

---

## ISdExcelXmlStyleDataXf

Cell format (xf) entry within `cellXfs`.

```typescript
export interface ISdExcelXmlStyleDataXf {
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
  alignment?: [
    {
      $: {
        horizontal?: "center" | "left" | "right";
        vertical?: "center" | "top" | "bottom";
      };
    },
  ];
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `$.numFmtId` | `string \| undefined` | Number format ID |
| `$.fontId` | `string \| undefined` | Font index |
| `$.fillId` | `string \| undefined` | Fill index |
| `$.borderId` | `string \| undefined` | Border index |
| `$.xfId` | `string \| undefined` | Base XF ID |
| `$.applyNumberFormat` | `string \| undefined` | Whether number format is applied (`"1"` = yes) |
| `$.applyFont` | `string \| undefined` | Whether font is applied |
| `$.applyAlignment` | `string \| undefined` | Whether alignment is applied |
| `$.applyFill` | `string \| undefined` | Whether fill is applied |
| `$.applyBorder` | `string \| undefined` | Whether border is applied |
| `alignment` | `[{ $: { horizontal?, vertical? } }] \| undefined` | Alignment settings |

---

## ISdExcelXmlStyleDataFill

Fill entry in the styles `fills` section.

```typescript
export interface ISdExcelXmlStyleDataFill {
  patternFill: [
    {
      $: { patternType: "none" | "solid" | "gray125" };
      fgColor?: [{ $: { rgb: string } }];
    },
  ];
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `patternFill[0].$.patternType` | `"none" \| "solid" \| "gray125"` | Fill pattern type |
| `patternFill[0].fgColor` | `[{ $: { rgb: string } }] \| undefined` | Foreground color in `AARRGGBB` hex format |

---

## ISdExcelXmlStyleDataBorder

Border entry in the styles `borders` section. Each direction is optional.

```typescript
export interface ISdExcelXmlStyleDataBorder {
  top?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
  left?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
  right?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
  bottom?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `top` | `[{ $: { style }, color? }] \| undefined` | Top border |
| `left` | `[{ $: { style }, color? }] \| undefined` | Left border |
| `right` | `[{ $: { style }, color? }] \| undefined` | Right border |
| `bottom` | `[{ $: { style }, color? }] \| undefined` | Bottom border |

Each border direction has:

| Field | Type | Description |
|-------|------|-------------|
| `$.style` | `"thin" \| "medium"` | Border line style |
| `color` | `[{ $: { rgb: string } }] \| undefined` | Border color in `AARRGGBB` hex format |

---

## ISdExcelAddressPoint

Single cell address with zero-based row and column indices.

```typescript
export interface ISdExcelAddressPoint {
  r: number;
  c: number;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `r` | `number` | Zero-based row index |
| `c` | `number` | Zero-based column index |

---

## ISdExcelAddressRangePoint

Cell range defined by a start point and an end point.

```typescript
export interface ISdExcelAddressRangePoint {
  s: ISdExcelAddressPoint;
  e: ISdExcelAddressPoint;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `s` | `ISdExcelAddressPoint` | Start (top-left) cell address |
| `e` | `ISdExcelAddressPoint` | End (bottom-right) cell address |

---

## TSdExcelValueType

Union type for all supported cell value types.

```typescript
export type TSdExcelValueType =
  | number
  | string
  | DateOnly
  | DateTime
  | Time
  | boolean
  | undefined;
```

---

## TSdExcelNumberFormat

String literal union for named number formats.

```typescript
export type TSdExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

---

## sdExcelNumberFormats

Array constant containing all valid `TSdExcelNumberFormat` values.

```typescript
export const sdExcelNumberFormats: TSdExcelNumberFormat[] = [
  "number",
  "string",
  "DateOnly",
  "DateTime",
  "Time",
];
```
