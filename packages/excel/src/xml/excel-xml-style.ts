import type {
  ExcelBorderPosition,
  ExcelHorizontalAlign,
  ExcelVerticalAlign,
  ExcelXml,
  ExcelXmlStyleData,
  ExcelXmlStyleDataBorder,
  ExcelXmlStyleDataFill,
  ExcelXmlStyleDataXf,
} from "../types";
import "@simplysm/core-common";
import { numParseInt, objClone, objEqual } from "@simplysm/core-common";

export interface ExcelStyle {
  numFmtId?: string;
  numFmtCode?: string;
  border?: ExcelBorderPosition[];
  background?: string;
  verticalAlign?: ExcelVerticalAlign;
  horizontalAlign?: ExcelHorizontalAlign;
}

/**
 * Class managing xl/styles.xml.
 * Handles styles such as number formats, background colors, borders, and alignment.
 */
export class ExcelXmlStyle implements ExcelXml {
  data: ExcelXmlStyleData;

  constructor(data?: ExcelXmlStyleData) {
    if (data === undefined) {
      this.data = {
        styleSheet: {
          $: {
            xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          },
          fonts: [
            {
              $: { count: "1" },
              font: [{}],
            },
          ],
          fills: [
            {
              $: { count: "2" },
              fill: [
                { patternFill: [{ $: { patternType: "none" } }] },
                { patternFill: [{ $: { patternType: "gray125" } }] },
              ],
            },
          ],
          borders: [
            {
              $: { count: "1" },
              border: [{}],
            },
          ],
          cellXfs: [
            {
              $: { count: "1" },
              xf: [{ $: { numFmtId: "0" } }],
            },
          ],
        },
      };
    } else {
      this.data = data;
    }
  }

  add(style: ExcelStyle): string {
    const newXf: ExcelXmlStyleDataXf = { $: {} };

    if (style.numFmtId !== undefined) {
      newXf.$.numFmtId = style.numFmtId;
    }

    if (style.numFmtCode !== undefined) {
      newXf.$.numFmtId = this._setNumFmtCode(style.numFmtCode);
      newXf.$.applyNumberFormat = "1";
    }

    if (style.background !== undefined) {
      const newFill: ExcelXmlStyleDataFill = {
        patternFill: [
          {
            $: { patternType: "solid" },
            fgColor: [{ $: { rgb: style.background.toUpperCase() } }],
          },
        ],
      };

      newXf.$.applyFill = "1";
      newXf.$.fillId = this._getSameOrCreateFill(newFill);
    }

    if (style.border !== undefined) {
      const newBorder = this._createBorderFromPositions(style.border);
      newXf.$.applyBorder = "1";
      newXf.$.borderId = this._getSameOrCreateBorder(newBorder);
    }

    this._applyAlignment(newXf, style);

    return this._getSameOrCreateXf(newXf);
  }

  addWithClone(id: string, style: ExcelStyle): string {
    const idNum = numParseInt(id);
    if (idNum == null) {
      throw new Error(`Invalid style ID: ${id}`);
    }
    const xfArray = this.data.styleSheet.cellXfs[0].xf;
    if (idNum < 0 || idNum >= xfArray.length) {
      throw new Error(`Non-existent style ID: ${id} (Range: 0-${xfArray.length - 1})`);
    }
    const prevXf = xfArray[idNum];
    const cloneXf = objClone(prevXf);

    if (style.numFmtId !== undefined) {
      cloneXf.$.numFmtId = style.numFmtId;
    }

    if (style.numFmtCode !== undefined) {
      cloneXf.$.numFmtId = this._setNumFmtCode(style.numFmtCode);
      cloneXf.$.applyNumberFormat = "1";
    }

    if (style.background !== undefined) {
      const fillIdNum = cloneXf.$.fillId !== undefined ? numParseInt(cloneXf.$.fillId) : undefined;
      const prevFill =
        fillIdNum !== undefined ? this.data.styleSheet.fills[0].fill[fillIdNum] : undefined;

      if (prevFill != null) {
        const cloneFill = objClone(prevFill);
        cloneFill.patternFill[0].$.patternType = "solid";

        if (cloneFill.patternFill[0].fgColor == null) {
          cloneFill.patternFill[0].fgColor = [{ $: { rgb: style.background } }];
        } else {
          cloneFill.patternFill[0].fgColor[0].$.rgb = style.background;
        }

        cloneXf.$.applyFill = "1";
        cloneXf.$.fillId = this._getSameOrCreateFill(cloneFill);
      } else {
        const newFill: ExcelXmlStyleDataFill = {
          patternFill: [
            {
              $: { patternType: "solid" },
              fgColor: [{ $: { rgb: style.background.toUpperCase() } }],
            },
          ],
        };
        cloneXf.$.applyFill = "1";
        cloneXf.$.fillId = this._getSameOrCreateFill(newFill);
      }
    }

    if (style.border !== undefined) {
      const borderIdNum =
        cloneXf.$.borderId !== undefined ? numParseInt(cloneXf.$.borderId) : undefined;
      const prevBorder =
        borderIdNum !== undefined ? this.data.styleSheet.borders[0].border[borderIdNum] : undefined;

      if (prevBorder != null) {
        const cloneBorder = objClone(prevBorder);
        this._applyBorderPosition(cloneBorder, "left", style.border.includes("left"));
        this._applyBorderPosition(cloneBorder, "right", style.border.includes("right"));
        this._applyBorderPosition(cloneBorder, "top", style.border.includes("top"));
        this._applyBorderPosition(cloneBorder, "bottom", style.border.includes("bottom"));

        cloneXf.$.applyBorder = "1";
        cloneXf.$.borderId = this._getSameOrCreateBorder(cloneBorder);
      } else {
        const newBorder = this._createBorderFromPositions(style.border);
        cloneXf.$.applyBorder = "1";
        cloneXf.$.borderId = this._getSameOrCreateBorder(newBorder);
      }
    }

    this._applyAlignment(cloneXf, style);

    return this._getSameOrCreateXf(cloneXf);
  }

  get(id: string): ExcelStyle {
    const idNum = numParseInt(id);
    if (idNum == null) {
      throw new Error(`Invalid style ID: ${id}`);
    }
    const xf = this.data.styleSheet.cellXfs[0].xf[idNum] as ExcelXmlStyleDataXf | undefined;

    const result: ExcelStyle = {};

    if (xf !== undefined) {
      result.numFmtId = xf.$.numFmtId;

      if (xf.$.fillId !== undefined) {
        const fillIdNum = numParseInt(xf.$.fillId);
        if (fillIdNum != null) {
          const fill = this.data.styleSheet.fills[0].fill[fillIdNum] as
            | ExcelXmlStyleDataFill
            | undefined;
          if (fill == null) {
            throw new Error(
              `Non-existent fill ID: ${xf.$.fillId} (Range: 0-${this.data.styleSheet.fills[0].fill.length - 1})`,
            );
          }
          result.background = fill.patternFill[0].fgColor?.[0].$.rgb;
        }
      }

      if (xf.$.borderId !== undefined) {
        const borderIdNum = numParseInt(xf.$.borderId);
        if (borderIdNum == null) {
          throw new Error(`Invalid border ID: ${xf.$.borderId}`);
        }
        const border = this.data.styleSheet.borders[0].border[borderIdNum] as
          | ExcelXmlStyleDataBorder
          | undefined;
        if (border == null) {
          throw new Error(
            `Non-existent border ID: ${xf.$.borderId} (Range: 0-${this.data.styleSheet.borders[0].border.length - 1})`,
          );
        }
        if (
          border.top != null ||
          border.left != null ||
          border.right != null ||
          border.bottom != null
        ) {
          result.border = [];
          if (border.left != null) {
            result.border.push("left");
          }
          if (border.right != null) {
            result.border.push("right");
          }
          if (border.top != null) {
            result.border.push("top");
          }
          if (border.bottom != null) {
            result.border.push("bottom");
          }
        }
      }

      result.verticalAlign = xf.alignment?.[0].$.vertical;
      result.horizontalAlign = xf.alignment?.[0].$.horizontal;
    }

    return result;
  }

  getNumFmtCode(numFmtId: string): string | undefined {
    return (this.data.styleSheet.numFmts?.[0].numFmt ?? []).single(
      (item) => item.$.numFmtId === numFmtId,
    )?.$.formatCode;
  }

  cleanup(): void {
    const result = {} as ExcelXmlStyleData["styleSheet"];

    // Sort order (numFmts first)

    if (this.data.styleSheet.numFmts != null) {
      result.numFmts = this.data.styleSheet.numFmts;
    }

    const styleSheetRec = this.data.styleSheet as Record<string, unknown>;
    const resultRec = result as Record<string, unknown>;
    for (const key of Object.keys(styleSheetRec)) {
      if (key === "numFmts") continue;

      resultRec[key] = styleSheetRec[key];
    }

    this.data.styleSheet = result;
  }

  //#region Private Methods

  private _setNumFmtCode(numFmtCode: string): string {
    // Skip if the code already exists
    const existsNumFmtId = (this.data.styleSheet.numFmts?.[0].numFmt ?? []).single(
      (item) => item.$.formatCode === numFmtCode,
    )?.$.numFmtId;
    if (existsNumFmtId != null) {
      return existsNumFmtId;
    }

    this.data.styleSheet.numFmts = this.data.styleSheet.numFmts ?? [
      {
        $: { count: "0" },
        numFmt: [],
      },
    ];

    this.data.styleSheet.numFmts[0].numFmt = this.data.styleSheet.numFmts[0].numFmt ?? [];

    // Excel custom number formats start from ID 180+ (0-163: built-in, 164-179: reserved)
    const numFmts = this.data.styleSheet.numFmts[0].numFmt;
    const maxItem =
      numFmts.length > 0
        ? numFmts.orderByDesc((item) => numParseInt(item.$.numFmtId) ?? 180).first()
        : undefined;
    const maxId = maxItem ? (numParseInt(maxItem.$.numFmtId) ?? 180) : 180;
    const nextNumFmtId = (maxId + 1).toString();
    this.data.styleSheet.numFmts[0].numFmt.push({
      $: {
        numFmtId: nextNumFmtId,
        formatCode: numFmtCode,
      },
    });
    this.data.styleSheet.numFmts[0].$.count = (
      (numParseInt(this.data.styleSheet.numFmts[0].$.count) ?? 0) + 1
    ).toString();

    return nextNumFmtId;
  }

  private _applyAlignment(xf: ExcelXmlStyleDataXf, style: ExcelStyle): void {
    if (style.verticalAlign !== undefined) {
      xf.$.applyAlignment = "1";
      if (xf.alignment == null) {
        xf.alignment = [{ $: { vertical: style.verticalAlign } }];
      } else {
        xf.alignment[0].$.vertical = style.verticalAlign;
      }
    }

    if (style.horizontalAlign !== undefined) {
      xf.$.applyAlignment = "1";
      if (xf.alignment == null) {
        xf.alignment = [{ $: { horizontal: style.horizontalAlign } }];
      } else {
        xf.alignment[0].$.horizontal = style.horizontalAlign;
      }
    }
  }

  private _createBorderFromPositions(positions: ExcelBorderPosition[]): ExcelXmlStyleDataBorder {
    return {
      ...(positions.includes("left")
        ? { left: [{ $: { style: "thin" }, color: [{ $: { rgb: "00000000" } }] }] }
        : {}),
      ...(positions.includes("right")
        ? { right: [{ $: { style: "thin" }, color: [{ $: { rgb: "00000000" } }] }] }
        : {}),
      ...(positions.includes("top")
        ? { top: [{ $: { style: "thin" }, color: [{ $: { rgb: "00000000" } }] }] }
        : {}),
      ...(positions.includes("bottom")
        ? { bottom: [{ $: { style: "thin" }, color: [{ $: { rgb: "00000000" } }] }] }
        : {}),
    };
  }

  private _applyBorderPosition(
    border: ExcelXmlStyleDataBorder,
    position: ExcelBorderPosition,
    enabled: boolean,
  ): void {
    if (enabled) {
      const existing = border[position];
      if (existing == null) {
        border[position] = [{ $: { style: "thin" }, color: [{ $: { rgb: "00000000" } }] }];
      } else if (existing[0].color == null) {
        existing[0].color = [{ $: { rgb: "00000000" } }];
      } else {
        existing[0].color[0].$.rgb = "00000000";
      }
    } else {
      delete border[position];
    }
  }

  private _getSameOrCreateXf(xfItem: ExcelXmlStyleDataXf): string {
    const prevSameXf = this.data.styleSheet.cellXfs[0].xf.single((item) => objEqual(item, xfItem));

    if (prevSameXf != null) {
      return this.data.styleSheet.cellXfs[0].xf.indexOf(prevSameXf).toString();
    } else {
      this.data.styleSheet.cellXfs[0].xf.push(xfItem);
      this.data.styleSheet.cellXfs[0].$.count =
        this.data.styleSheet.cellXfs[0].xf.length.toString();
      return (this.data.styleSheet.cellXfs[0].xf.length - 1).toString();
    }
  }

  private _getSameOrCreateFill(fillItem: ExcelXmlStyleDataFill): string {
    const prevSameFill = this.data.styleSheet.fills[0].fill.single((item) =>
      objEqual(item, fillItem),
    );

    if (prevSameFill != null) {
      return this.data.styleSheet.fills[0].fill.indexOf(prevSameFill).toString();
    } else {
      this.data.styleSheet.fills[0].fill.push(fillItem);
      this.data.styleSheet.fills[0].$.count = this.data.styleSheet.fills[0].fill.length.toString();
      return (this.data.styleSheet.fills[0].fill.length - 1).toString();
    }
  }

  private _getSameOrCreateBorder(borderItem: ExcelXmlStyleDataBorder): string {
    const prevSameBorder = this.data.styleSheet.borders[0].border.single((item) =>
      objEqual(item, borderItem),
    );

    if (prevSameBorder != null) {
      return this.data.styleSheet.borders[0].border.indexOf(prevSameBorder).toString();
    } else {
      this.data.styleSheet.borders[0].border.push(borderItem);
      this.data.styleSheet.borders[0].$.count =
        this.data.styleSheet.borders[0].border.length.toString();
      return (this.data.styleSheet.borders[0].border.length - 1).toString();
    }
  }

  //#endregion
}
