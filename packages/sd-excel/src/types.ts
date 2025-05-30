import { DateOnly, DateTime, Time } from "@simplysm/sd-core-common";

export interface ISdExcelXmlContentTypeData {
  "Types": {
    "$": {
      "xmlns": string;
    };
    "Default": {
      "$": {
        "Extension": string;
        "ContentType": string;
      };
    }[];
    "Override": {
      "$": {
        "PartName": string;
        "ContentType": string;
      };
    }[];
  };
}

export interface ISdExcelXmlRelationshipData {
  "Relationships": {
    "$": {
      "xmlns": string;
    };
    "Relationship"?: ISdExcelRelationshipData[];
  };
}

export interface ISdExcelRelationshipData {
  "$": {
    "Id": string;
    "Target": string;
    "Type": string;
  };
}

export interface ISdExcelXmlWorkbookData {
  "workbook": {
    "$": {
      "xmlns": string;
      "xmlns:r"?: string;
    };
    "bookViews"?: [
      {
        "workbookView": [{}];
      }
    ];
    "sheets"?: [
      {
        "sheet": {
          "$": {
            "name": string;
            "sheetId": string;
            "r:id": string;
          };
        }[];
      }
    ];
  };
}

export interface ISdExcelXmlWorksheetData {
  "worksheet": {
    "$": { "xmlns": string };
    "dimension"?: [
      {
        "$": {
          "ref": string;
        };
      }
    ];
    "sheetViews"?: [
      {
        "sheetView": {
          "$": {
            "workbookViewId": string;
            "zoomScale"?: string;
          };
          "pane"?: [
            {
              "$": {
                "xSplit"?: string;
                "ySplit"?: string;
                "topLeftCell"?: string;
                "activePane"?: string;
                "state"?: string;
              }
            }
          ]
        }[];
      }
    ];
    "sheetFormatPr"?: [
      {
        "$": {
          "defaultRowHeight": string;
        };
      }
    ];
    "cols"?: [
      {
        "col": {
          "$": {
            "min": string;
            "max": string;
            "width"?: string;
            "bestFit"?: string;
            "customWidth"?: string;
          };
        }[];
      }
    ];
    "sheetData": [
      {
        "row"?: ISdExcelRowData[];
      }
    ];
    "mergeCells"?: [
      {
        "$": { count: string };
        "mergeCell": {
          "$": { "ref": string };
        }[];
      }
    ];
  };
}

export interface ISdExcelRowData {
  "$": {
    "r": string; // address (1~)
  };
  "c"?: ISdExcelCellData[];
}

export interface ISdExcelCellData {
  "$": {
    "r": string; // address (A~)
    "s"?: string; // styleId
    "t"?: string;  // type: s(sharedString)
  };
  "v"?: [string];
  "f"?: [string];
  "is"?: {
    t?: {
      "_"?: string
    }[]
  }[];
}

export interface ISdExcelXmlSharedStringData {
  "sst": {
    "$": { "xmlns": string };
    "si"?: TSdExcelXmlSharedStringDataSi[];
  };
}

export type TSdExcelXmlSharedStringDataSi =
  {
    "t": TSdExcelXmlSharedStringData;
  }
  |
  {
    "r": {
      "t": TSdExcelXmlSharedStringData;
    }[];
  };

export type TSdExcelXmlSharedStringData = [
    string | {
    "$": { "space"?: "preserve" };
    "_"?: string
  }
];


export interface ISdExcelXmlStyleData {
  "styleSheet": {
    "$": { "xmlns": string };
    "numFmts"?: [
      {
        "$": { count: string };
        "numFmt"?: {
          "$": {
            numFmtId: string;
            formatCode: string;
          };
        }[];
      }
    ];
    "fonts": [
      {
        "$": { count: string };
        "font": {}[];
      }
    ];
    "fills": [
      {
        "$": { count: string };
        "fill": ISdExcelXmlStyleDataFill[];
      }
    ];
    "borders": [
      {
        "$": { count: string };
        "border": ISdExcelXmlStyleDataBorder[];
      }
    ];
    "cellXfs": [
      {
        "$": { count: string };
        "xf": ISdExcelXmlStyleDataXf[];
      }
    ];
  };
}

export interface ISdExcelXmlStyleDataXf {
  "$": {
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
      "$": { horizontal?: "center" | "left" | "right"; vertical?: "center" | "top" | "bottom" }
    }
  ];
}

export interface ISdExcelXmlStyleDataFill {
  "patternFill": [
    {
      "$": { "patternType": "none" | "solid" | "gray125" };
      "fgColor"?: [{ "$": { "rgb": string } }];
    }
  ];
}

export interface ISdExcelXmlStyleDataBorder {
  "top"?: [
    {
      "$": { "style": "thin" | "medium" };
      "color"?: [{ "$": { "rgb": string } }];
    }
  ];
  "left"?: [
    {
      "$": { "style": "thin" | "medium" };
      "color"?: [{ "$": { "rgb": string } }];
    }
  ];
  "right"?: [
    {
      "$": { "style": "thin" | "medium" };
      "color"?: [{ "$": { "rgb": string } }];
    }
  ];
  "bottom"?: [
    {
      "$": { "style": "thin" | "medium" };
      "color"?: [{ "$": { "rgb": string } }];
    }
  ];
}

export type TSdExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
export type TSdExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
export const sdExcelNumberFormats: TSdExcelNumberFormat[] = [
  "number",
  "string",
  "DateOnly",
  "DateTime",
  "Time",
];

export interface ISdExcelXml {
  readonly data: any;

  cleanup(): void;
}

export interface ISdExcelAddressPoint {
  r: number;
  c: number;
}

export interface ISdExcelAddressRangePoint {
  s: ISdExcelAddressPoint;
  e: ISdExcelAddressPoint;
}
