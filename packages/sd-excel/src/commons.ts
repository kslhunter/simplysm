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
    "sheets"?: [{
      "sheet": {
        "$": {
          "name": string;
          "sheetId": string;
          "r:id": string;
        };
      }[];
    }];
  };
}

export interface ISdExcelXmlWorksheetData {
  "worksheet": {
    "$": { "xmlns": string };
    "dimension": [{
      "$": {
        "ref": string;
      };
    }];
    "sheetData": [{
      "row"?: ISdExcelRowData[];
    }];
  };
}

export interface ISdExcelRowData {
  "$": {
    "r": string; // address (1~)
  };
  "c": ISdExcelCellData[];
}

export interface ISdExcelCellData {
  "$": {
    "r": string; // address (A~)
    "s"?: string; // styleId
    "t"?: string;  // type: s(sharedString)
  };
  "v"?: [string];
}

export interface ISdExcelXmlSharedStringData {
  "sst": {
    "$": { "xmlns": string };
    "si"?: {
      "t": [string | { "_": string }];
    }[];
  };
}

export interface ISdExcelXmlStyleData {
  "styleSheet": {
    "$": { "xmlns": string };
    "numFmts"?: [{
      "$": { count: string };
      "numFmt": {
        "$": {
          numFmtId: string;
          formatCode: string;
        };
      }[];
    }];
    "fonts": [{
      "$": { count: string };
      "font": {}[];
    }];
    "fills": [{
      "$": { count: string };
      "fill": {}[];
    }];
    "borders": [{
      "$": { count: string };
      "border": {}[];
    }];
    "cellXfs": [{
      "$": { count: string };
      "xf": ISdExcelXmlStyleDataXf[];
    }];
  };
}

export interface ISdExcelXmlStyleDataXf {
  "$": {
    numFmtId: string;
    fontId?: string;
    fillId?: string;
    borderId?: string;
    xfId?: string;
    applyNumberFormat?: string;
    applyFont?: string;
    applyAlignment?: string;
  };
}

export type TSdExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
export type TSdExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";

export interface ISdExcelXml {
  readonly data: any;
}

export interface ISdExcelAddressPoint {
  r: number;
  c: number;
}

export interface ISdExcelAddressRangePoint {
  s: ISdExcelAddressPoint;
  e: ISdExcelAddressPoint;
}
