import type { DateOnly, DateTime, Time } from "@simplysm/core-common";

//#region XML Data Types

export interface ExcelXmlContentTypeData {
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

export interface ExcelXmlRelationshipData {
  Relationships: {
    $: {
      xmlns: string;
    };
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

export interface ExcelXmlWorksheetData {
  worksheet: {
    $: { "xmlns": string; "xmlns:r"?: string };
    dimension?: [
      {
        $: {
          ref: string;
        };
      },
    ];
    sheetViews?: [
      {
        sheetView: {
          $: {
            workbookViewId: string;
            zoomScale?: string;
          };
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
    sheetFormatPr?: [
      {
        $: {
          defaultRowHeight: string;
        };
      },
    ];
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
    sheetData: [
      {
        row?: ExcelRowData[];
      },
    ];
    mergeCells?: [
      {
        $: { count: string };
        mergeCell: {
          $: { ref: string };
        }[];
      },
    ];
    drawing?: { $: { "r:id": string } }[];
  };
}

export interface ExcelRowData {
  $: {
    r: string; // address (1~)
  };
  c?: ExcelCellData[];
}

export interface ExcelCellData {
  $: {
    r: string; // address (A~)
    s?: string; // styleId
    t?: string; // type: s(sharedString)
  };
  v?: [string];
  f?: [string];
  is?: {
    t?: {
      _?: string;
    }[];
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
      from?: {
        col: string[];
        colOff?: string[];
        row: string[];
        rowOff?: string[];
      }[];
      to?: {
        col: string[];
        colOff?: string[];
        row: string[];
        rowOff?: string[];
      }[];
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
  | {
      t: ExcelXmlSharedStringDataText;
    }
  | {
      r: {
        t: ExcelXmlSharedStringDataText;
      }[];
    };

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
        numFmt?: {
          $: {
            numFmtId: string;
            formatCode: string;
          };
        }[];
      },
    ];
    fonts: [
      {
        $: { count: string };
        font: {}[];
      },
    ];
    fills: [
      {
        $: { count: string };
        fill: ExcelXmlStyleDataFill[];
      },
    ];
    borders: [
      {
        $: { count: string };
        border: ExcelXmlStyleDataBorder[];
      },
    ];
    cellXfs: [
      {
        $: { count: string };
        xf: ExcelXmlStyleDataXf[];
      },
    ];
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
  alignment?: [
    {
      $: { horizontal?: "center" | "left" | "right"; vertical?: "center" | "top" | "bottom" };
    },
  ];
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
  top?: [
    {
      $: { style: "thin" | "medium" };
      color?: [{ $: { rgb: string } }];
    },
  ];
  left?: [
    {
      $: { style: "thin" | "medium" };
      color?: [{ $: { rgb: string } }];
    },
  ];
  right?: [
    {
      $: { style: "thin" | "medium" };
      color?: [{ $: { rgb: string } }];
    },
  ];
  bottom?: [
    {
      $: { style: "thin" | "medium" };
      color?: [{ $: { rgb: string } }];
    },
  ];
}

//#endregion

//#region Value Types

export type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
export type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";

/**
 * Excel cell type
 * - s: shared string (SharedString)
 * - b: boolean
 * - str: formula result string
 * - n: number
 * - inlineStr: inline string (rich text)
 * - e: error
 */
export type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";

//#endregion

//#region Address Types

export interface ExcelAddressPoint {
  r: number;
  c: number;
}

export interface ExcelAddressRangePoint {
  s: ExcelAddressPoint;
  e: ExcelAddressPoint;
}

//#endregion

//#region Excel XML Interface

export interface ExcelXml {
  readonly data: unknown;
  cleanup(): void;
}

//#endregion

//#region Style Types

export type ExcelBorderPosition = "left" | "right" | "top" | "bottom";
export type ExcelHorizontalAlign = "center" | "left" | "right";
export type ExcelVerticalAlign = "center" | "top" | "bottom";

/**
 * Cell style options
 * @example
 * ```typescript
 * await cell.setStyle({
 *   background: "00FF0000",  // red
 *   border: ["left", "right", "top", "bottom"],
 *   horizontalAlign: "center",
 *   verticalAlign: "center",
 *   numberFormat: "number",
 * });
 * ```
 */
export interface ExcelStyleOptions {
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

//#endregion
