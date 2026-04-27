# XML Data Types

> **읽어야 하는 상황**: 공개 export된 xlsx XML 데이터 구조 타입을 직접 참조해야 할 때. 일반적인 파일 읽기/쓰기, 셀 조작, 스타일 설정은 [`ExcelWorkbook`](../core-classes/excel-workbook.md), [`ExcelWorksheet`](../core-classes/excel-worksheet.md), [`ExcelStyleOptions`](./excel-style-options.md)를 먼저 확인.

이 파일의 타입은 `types.ts`에서 export되는 xlsx 내부 XML 데이터 구조다. 소비자 코드에서 보통 값을 직접 만들지 않고, XML 구조를 타입으로 받거나 검사하는 코드에서 사용한다.

## Signature

```typescript
export interface ExcelXmlContentTypeData {
  Types: {
    $: { xmlns: string };
    Default: { $: { Extension: string; ContentType: string } }[];
    Override: { $: { PartName: string; ContentType: string } }[];
  };
}

export interface ExcelXmlRelationshipData {
  Relationships: {
    $: { xmlns: string };
    Relationship?: ExcelRelationshipData[];
  };
}

export interface ExcelRelationshipData {
  $: {
    Id: string;
    Target: string;
    Type: string;
  };
}

export interface ExcelXmlWorkbookData {
  workbook: {
    $: { "xmlns": string; "xmlns:r"?: string };
    bookViews?: [{ workbookView: [{}] }];
    sheets?: [
      {
        sheet: {
          $: { "name": string; "sheetId": string; "r:id": string };
        }[];
      },
    ];
  };
}

export interface ExcelXmlWorksheetData {
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
    sheetData: [{ row?: ExcelRowData[] }];
    mergeCells?: [{ $: { count: string }; mergeCell: { $: { ref: string } }[] }];
    drawing?: { $: { "r:id": string } }[];
  };
}

export interface ExcelRowData {
  $: { r: string };
  c?: ExcelCellData[];
}

export interface ExcelCellData {
  $: {
    r: string;
    s?: string;
    t?: ExcelCellType;
  };
  v?: [string];
  f?: [string];
  is?: {
    t?: (string | { _?: string })[];
  }[];
}

export interface ExcelXmlDrawingData {
  wsDr: {
    $: {
      "xmlns": string;
      "xmlns:a"?: string;
      "xmlns:r"?: string;
    };
    twoCellAnchor?: {
      from?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      to?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      pic?: {
        nvPicPr?: {
          cNvPr?: { $: { id: string; name: string; descr?: string } }[];
          cNvPicPr?: Array<{ "a:picLocks"?: Array<{ $: { noChangeAspect?: string } }> }>;
        }[];
        blipFill?: {
          "a:blip"?: Array<{ $: { "r:embed": string } }>;
          "a:stretch"?: Array<{ "a:fillRect": unknown[] }>;
        }[];
        spPr?: {
          "a:xfrm"?: Array<{
            "a:off"?: Array<{ $: { x: string; y: string } }>;
            "a:ext"?: Array<{ $: { cx: string; cy: string } }>;
          }>;
          "a:prstGeom"?: Array<{ "$": { prst: string }; "a:avLst": unknown[] }>;
        }[];
      }[];
      clientData?: unknown[];
    }[];
  };
}

export interface ExcelXmlSharedStringData {
  sst: {
    $: { xmlns: string };
    si?: ExcelXmlSharedStringDataSi[];
  };
}

export type ExcelXmlSharedStringDataSi =
  | { t: ExcelXmlSharedStringDataText }
  | { r: { t: ExcelXmlSharedStringDataText }[] };

export type ExcelXmlSharedStringDataText = [
  | string
  | {
      $: { space?: "preserve" };
      _?: string;
    },
];

export interface ExcelXmlStyleData {
  styleSheet: {
    $: { xmlns: string };
    numFmts?: [
      {
        $: { count: string };
        numFmt?: { $: { numFmtId: string; formatCode: string } }[];
      },
    ];
    fonts: [{ $: { count: string }; font: {}[] }];
    fills: [{ $: { count: string }; fill: ExcelXmlStyleDataFill[] }];
    borders: [{ $: { count: string }; border: ExcelXmlStyleDataBorder[] }];
    cellXfs: [{ $: { count: string }; xf: ExcelXmlStyleDataXf[] }];
  };
}

export interface ExcelXmlStyleDataXf {
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

export interface ExcelXmlStyleDataFill {
  patternFill: [
    {
      $: { patternType: "none" | "solid" | "gray125" };
      fgColor?: [{ $: { rgb: string } }];
    },
  ];
}

export interface ExcelXmlStyleDataBorder {
  top?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
  left?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
  right?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
  bottom?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
}

export interface ExcelXml {
  readonly data: unknown;
  cleanup(): void;
}
```

## When to use

- ✅ xlsx 내부 XML part와 동일한 형태의 객체를 타입으로 받아야 할 때
- ✅ `ExcelXml` 구현체처럼 `data`와 `cleanup()` 계약을 만족하는 객체를 다룰 때
- ❌ 일반적인 워크북 생성, 시트 조작, 셀 값 쓰기에는 런타임 클래스 API를 사용

## Related Types

### `ExcelXmlContentTypeData`

`[Content_Types].xml` 구조다. `Default`와 `Override` 항목을 포함한다.

### `ExcelXmlRelationshipData` / `ExcelRelationshipData`

`.rels` 파일 구조와 단일 relationship 항목 구조다. `Relationship` 배열은 없을 수 있다.

### `ExcelXmlWorkbookData`

`xl/workbook.xml` 구조다. `bookViews`와 `sheets`는 선택 필드다.

### `ExcelXmlWorksheetData` / `ExcelRowData` / `ExcelCellData`

워크시트, 행, 셀 XML 구조다. 셀 주소와 행 주소는 XML 값이므로 문자열로 표현된다.

### `ExcelXmlDrawingData`

이미지 삽입에 사용하는 drawing XML 구조다. `twoCellAnchor` 기반 위치와 picture 데이터를 포함한다.

### `ExcelXmlSharedStringData` / `ExcelXmlSharedStringDataSi` / `ExcelXmlSharedStringDataText`

SharedStrings XML 구조다. 단순 텍스트와 rich text run 형태를 모두 표현한다.

### `ExcelXmlStyleData` / `ExcelXmlStyleDataXf` / `ExcelXmlStyleDataFill` / `ExcelXmlStyleDataBorder`

Styles XML 구조다. number format, fill, border, cell format 정보를 포함한다.

### `ExcelXml`

내부 XML 모델의 공통 계약이다.
