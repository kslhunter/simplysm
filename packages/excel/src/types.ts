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
    sheetPr?: [
      {
        tabColor?: [
          {
            $: { rgb: string };
          },
        ];
      },
    ];
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
    conditionalFormatting?: ExcelXmlConditionalFormattingData[];
    drawing?: { $: { "r:id": string } }[];
  };
}

export interface ExcelXmlConditionalFormattingData {
  $: { sqref: string };
  cfRule: ExcelXmlCfRuleData[];
}

export interface ExcelXmlCfRuleData {
  $: {
    type:
      | "cellIs"
      | "containsText"
      | "notContainsText"
      | "beginsWith"
      | "endsWith"
      | "expression";
    operator?:
      | "lessThan"
      | "lessThanOrEqual"
      | "equal"
      | "notEqual"
      | "greaterThanOrEqual"
      | "greaterThan"
      | "between"
      | "notBetween"
      | "containsText"
      | "notContains"
      | "beginsWith"
      | "endsWith";
    priority: string;
    dxfId: string;
    text?: string;
  };
  formula: string[];
}

export interface ExcelRowData {
  $: {
    r: string; // 주소 (1~)
  };
  c?: ExcelCellData[];
}

export interface ExcelCellData {
  $: {
    r: string; // 주소 (A~)
    s?: string; // 스타일 ID
    t?: ExcelCellType; // 타입: s(sharedString)
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
        font: ExcelXmlStyleDataFont[];
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
    dxfs?: [
      {
        $: { count: string };
        dxf: ExcelXmlStyleDataDxf[];
      },
    ];
  };
}

export interface ExcelXmlStyleDataFont {
  sz?: [{ $: { val: string } }];
  name?: [{ $: { val: string } }];
  b?: [{}];
  i?: [{}];
  u?: [{ $?: { val?: ExcelFontUnderline } }];
  strike?: [{}];
  color?: [{ $: { rgb: string } }];
}

export interface ExcelXmlStyleDataDxf {
  font?: [
    {
      b?: [{ $: { val: "0" | "1" } }];
      color?: [{ $: { rgb: string } }];
    },
  ];
  fill?: [
    {
      patternFill: [
        {
          $: { patternType?: "solid" };
          bgColor?: [{ $: { rgb: string } }];
        },
      ];
    },
  ];
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
 * Excel 셀 타입
 * - s: 공유 문자열 (SharedString)
 * - b: boolean
 * - str: 수식 결과 문자열
 * - n: 숫자
 * - inlineStr: 인라인 문자열 (서식 있는 텍스트)
 * - e: 에러
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
export type ExcelFontUnderline = "single" | "double" | "singleAccounting" | "doubleAccounting";

/**
 * 폰트 속성. cell 단위 override (`ExcelStyleOptions.font`) 와
 * workbook default (`wb.setDefaultStyle({ font })`) 양쪽이 공유한다.
 *
 * 미지정 속성은 OOXML `<font>` 자식 엘리먼트로 emit 되지 않으며, Excel 자체 기본값으로 표시된다.
 */
export interface ExcelFont {
  /** 폰트 크기 (pt) */
  size?: number;
  /** 폰트명 (예: "맑은 고딕", "Calibri") */
  family?: string;
  /** 굵게 */
  bold?: boolean;
  /** 기울임 */
  italic?: boolean;
  /** 밑줄 — `<u val="..."/>` 의 val 에 그대로 매핑 */
  underline?: ExcelFontUnderline;
  /** 글자색 (ARGB 8자리, 예: "00FF0000") */
  color?: string;
  /** 취소선 */
  strike?: boolean;
}

/**
 * 셀 스타일 옵션
 * @example
 * ```typescript
 * await cell.setStyle({
 *   background: "00FF0000",  // 빨강
 *   border: ["left", "right", "top", "bottom"],
 *   horizontalAlign: "center",
 *   verticalAlign: "center",
 *   numberFormat: "number",
 * });
 *
 * // 임의의 Excel formatCode 지정
 * await cell.setStyle({ numberFormatCode: "0.000000" });
 * ```
 */
export interface ExcelStyleOptions {
  /** 배경색 (ARGB 형식, 예: "00FF0000") */
  background?: string;
  /** 테두리 위치 */
  border?: ExcelBorderPosition[];
  /** 가로 정렬 */
  horizontalAlign?: ExcelHorizontalAlign;
  /** 세로 정렬 */
  verticalAlign?: ExcelVerticalAlign;
  /** 숫자 형식 프리셋 */
  numberFormat?: ExcelNumberFormat;
  /**
   * 커스텀 Excel formatCode 문자열 (예: "0.000000", "#,##0.00", "0.00%").
   * `numberFormat`과 동시 지정 시 이 필드가 우선 적용된다.
   */
  numberFormatCode?: string;
  /** 폰트 (size/family/bold/italic/underline/color/strike) */
  font?: ExcelFont;
}

//#endregion

//#region Conditional Format Types

/**
 * 조건부 서식 강조 스타일.
 * 미지정 필드는 base 셀 스타일을 그대로 두고, 지정 필드만 OOXML dxf 로 emit 되어 native CF 오버레이로 합성된다.
 */
export interface ExcelConditionalRuleStyle {
  /** 배경색 (ARGB 8자리, 예: "00FFFF00") */
  background?: string;
  /** 글자색 (ARGB 8자리) */
  fontColor?: string;
  /** 글자 굵기. "normal" 은 base 가 bold 라도 강제 normal. */
  fontWeight?: "bold" | "normal";
}

/**
 * 조건부 서식 규칙.
 * - `cellIs` 단일 비교(`<`, `>`, `<=`, `>=`, `=`, `<>`): `value` 는 number 또는 string.
 * - `cellIs` 구간(`between`, `notBetween`): `value` 는 [a, b] 튜플(양 끝 inclusive).
 * - `text` 매칭(`contains`, `notContains`, `beginsWith`, `endsWith`): `value` 는 string. SEARCH 기반(대소문자 무시) 고정.
 *
 * `value: number` 는 raw formula(`<formula>4999</formula>`), `value: string` 은 따옴표 둘러싼 리터럴 formula(`<formula>"OK"</formula>`) 로 emit.
 */
export type ExcelConditionalRule =
  | {
      type: "cellIs";
      op: "<" | ">" | "<=" | ">=" | "=" | "<>";
      value: number | string;
      style: ExcelConditionalRuleStyle;
    }
  | {
      type: "cellIs";
      op: "between" | "notBetween";
      value: [number, number] | [string, string];
      style: ExcelConditionalRuleStyle;
    }
  | {
      type: "text";
      op: "contains" | "notContains" | "beginsWith" | "endsWith";
      value: string;
      style: ExcelConditionalRuleStyle;
    }
  | {
      type: "expression";
      formula: string;
      style: ExcelConditionalRuleStyle;
    };

//#endregion
