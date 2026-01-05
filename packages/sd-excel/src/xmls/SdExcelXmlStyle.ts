import type {
  ISdExcelXml,
  ISdExcelXmlStyleData,
  ISdExcelXmlStyleDataBorder,
  ISdExcelXmlStyleDataFill,
  ISdExcelXmlStyleDataXf,
} from "../types";
import { NumberUtils, ObjectUtils } from "@simplysm/sd-core-common";

export class SdExcelXmlStyle implements ISdExcelXml {
  data: ISdExcelXmlStyleData;

  constructor(data?: ISdExcelXmlStyleData) {
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

  add(style: ISdExcelStyle): string {
    const newXf: ISdExcelXmlStyleDataXf = { $: {} };

    if (style.numFmtId !== undefined) {
      newXf.$.numFmtId = style.numFmtId;
    }

    if (style.numFmtCode !== undefined) {
      newXf.$.numFmtId = this._setNumFmtCode(style.numFmtCode);
      newXf.$.applyNumberFormat = "1";
    }

    if (style.background !== undefined) {
      const newFill: ISdExcelXmlStyleDataFill = {
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
      const newBorder: ISdExcelXmlStyleDataBorder = {
        ...(style.border.includes("left")
          ? {
              left: [
                {
                  $: { style: "thin" },
                  color: [{ $: { rgb: "00000000" } }],
                },
              ],
            }
          : {}),
        ...(style.border.includes("right")
          ? {
              right: [
                {
                  $: { style: "thin" },
                  color: [{ $: { rgb: "00000000" } }],
                },
              ],
            }
          : {}),
        ...(style.border.includes("top")
          ? {
              top: [
                {
                  $: { style: "thin" },
                  color: [{ $: { rgb: "00000000" } }],
                },
              ],
            }
          : {}),
        ...(style.border.includes("bottom")
          ? {
              bottom: [
                {
                  $: { style: "thin" },
                  color: [{ $: { rgb: "00000000" } }],
                },
              ],
            }
          : {}),
      };

      newXf.$.applyBorder = "1";
      newXf.$.borderId = this._getSameOrCreateBorder(newBorder);
    }

    if (style.verticalAlign !== undefined) {
      newXf.$.applyAlignment = "1";
      if (!newXf.alignment) {
        newXf.alignment = [{ $: { vertical: style.verticalAlign } }];
      } else {
        newXf.alignment[0].$.vertical = style.verticalAlign;
      }
    }

    if (style.horizontalAlign !== undefined) {
      newXf.$.applyAlignment = "1";
      if (!newXf.alignment) {
        newXf.alignment = [{ $: { horizontal: style.horizontalAlign } }];
      } else {
        newXf.alignment[0].$.horizontal = style.horizontalAlign;
      }
    }

    return this._getSameOrCreateXf(newXf);
  }

  addWithClone(id: string, style: ISdExcelStyle): string {
    const prevXf = this.data.styleSheet.cellXfs[0].xf[NumberUtils.parseInt(id)!];
    const cloneXf = ObjectUtils.clone(prevXf);

    if (style.numFmtId !== undefined) {
      cloneXf.$.numFmtId = style.numFmtId;
    }

    if (style.numFmtCode !== undefined) {
      cloneXf.$.numFmtId = this._setNumFmtCode(style.numFmtCode);
      cloneXf.$.applyNumberFormat = "1";
    }

    if (style.background !== undefined) {
      const prevFill =
        cloneXf.$.fillId !== undefined
          ? this.data.styleSheet.fills[0].fill[NumberUtils.parseInt(cloneXf.$.fillId)!]
          : undefined;

      if (prevFill) {
        const cloneFill = ObjectUtils.clone(prevFill);

        cloneFill.patternFill[0].$.patternType = "solid";

        if (!cloneFill.patternFill[0].fgColor) {
          cloneFill.patternFill[0].fgColor = [{ $: { rgb: style.background } }];
        } else {
          cloneFill.patternFill[0].fgColor[0].$.rgb = style.background;
        }

        cloneXf.$.applyFill = "1";
        cloneXf.$.fillId = this._getSameOrCreateFill(cloneFill);
        return this._getSameOrCreateXf(cloneXf);
      } else {
        const newFill: ISdExcelXmlStyleDataFill = {
          patternFill: [
            {
              $: { patternType: "solid" },
              fgColor: [{ $: { rgb: style.background.toUpperCase() } }],
            },
          ],
        };
        cloneXf.$.applyFill = "1";
        cloneXf.$.fillId = this._getSameOrCreateFill(newFill);
        return this._getSameOrCreateXf(cloneXf);
      }
    }

    if (style.border !== undefined) {
      const prevBorder =
        cloneXf.$.borderId !== undefined
          ? this.data.styleSheet.borders[0].border[NumberUtils.parseInt(cloneXf.$.borderId)!]
          : undefined;

      if (prevBorder) {
        const cloneBorder = ObjectUtils.clone(prevBorder);
        if (style.border.includes("left")) {
          if (!cloneBorder.left) {
            cloneBorder.left = [
              {
                $: { style: "thin" },
                color: [{ $: { rgb: "00000000" } }],
              },
            ];
          } else if (!cloneBorder.left[0].color) {
            cloneBorder.left[0].color = [{ $: { rgb: "00000000" } }];
          } else {
            cloneBorder.left[0].color[0].$.rgb = "00000000";
          }
        } else {
          delete cloneBorder.left;
        }

        if (style.border.includes("right")) {
          if (!cloneBorder.right) {
            cloneBorder.right = [
              {
                $: { style: "thin" },
                color: [{ $: { rgb: "00000000" } }],
              },
            ];
          } else if (!cloneBorder.right[0].color) {
            cloneBorder.right[0].color = [{ $: { rgb: "00000000" } }];
          } else {
            cloneBorder.right[0].color[0].$.rgb = "00000000";
          }
        } else {
          delete cloneBorder.right;
        }

        if (style.border.includes("top")) {
          if (!cloneBorder.top) {
            cloneBorder.top = [
              {
                $: { style: "thin" },
                color: [{ $: { rgb: "00000000" } }],
              },
            ];
          } else if (!cloneBorder.top[0].color) {
            cloneBorder.top[0].color = [{ $: { rgb: "00000000" } }];
          } else {
            cloneBorder.top[0].color[0].$.rgb = "00000000";
          }
        } else {
          delete cloneBorder.top;
        }

        if (style.border.includes("bottom")) {
          if (!cloneBorder.bottom) {
            cloneBorder.bottom = [
              {
                $: { style: "thin" },
                color: [{ $: { rgb: "00000000" } }],
              },
            ];
          } else if (!Boolean(cloneBorder.bottom[0])) {
            cloneBorder.bottom[0] = {
              $: { style: "thin" },
              color: [{ $: { rgb: "00000000" } }],
            };
          } else if (!cloneBorder.bottom[0].color) {
            cloneBorder.bottom[0].color = [{ $: { rgb: "00000000" } }];
          } else {
            cloneBorder.bottom[0].color[0].$.rgb = "00000000";
          }
        } else {
          delete cloneBorder.bottom;
        }

        cloneXf.$.applyBorder = "1";
        cloneXf.$.borderId = this._getSameOrCreateBorder(cloneBorder);
        return this._getSameOrCreateXf(cloneXf);
      } else {
        const newBorder: ISdExcelXmlStyleDataBorder = {
          ...(style.border.includes("left")
            ? {
                left: [
                  {
                    $: { style: "thin" },
                    color: [{ $: { rgb: "00000000" } }],
                  },
                ],
              }
            : {}),
          ...(style.border.includes("right")
            ? {
                right: [
                  {
                    $: { style: "thin" },
                    color: [{ $: { rgb: "00000000" } }],
                  },
                ],
              }
            : {}),
          ...(style.border.includes("top")
            ? {
                top: [
                  {
                    $: { style: "thin" },
                    color: [{ $: { rgb: "00000000" } }],
                  },
                ],
              }
            : {}),
          ...(style.border.includes("bottom")
            ? {
                bottom: [
                  {
                    $: { style: "thin" },
                    color: [{ $: { rgb: "00000000" } }],
                  },
                ],
              }
            : {}),
        };
        cloneXf.$.applyBorder = "1";
        cloneXf.$.borderId = this._getSameOrCreateBorder(newBorder);
        return this._getSameOrCreateXf(cloneXf);
      }
    }

    if (style.verticalAlign !== undefined) {
      cloneXf.$.applyAlignment = "1";
      if (!cloneXf.alignment) {
        cloneXf.alignment = [{ $: { vertical: style.verticalAlign } }];
      } else {
        cloneXf.alignment[0].$.vertical = style.verticalAlign;
      }
    }

    if (style.horizontalAlign !== undefined) {
      cloneXf.$.applyAlignment = "1";
      if (!cloneXf.alignment) {
        cloneXf.alignment = [{ $: { horizontal: style.horizontalAlign } }];
      } else {
        cloneXf.alignment[0].$.horizontal = style.horizontalAlign;
      }
    }

    return this._getSameOrCreateXf(cloneXf);
  }

  get(id: string): ISdExcelStyle {
    const xf = this.data.styleSheet.cellXfs[0].xf[NumberUtils.parseInt(id)!] as
      | ISdExcelXmlStyleDataXf
      | undefined;

    const result: ISdExcelStyle = {};

    if (xf !== undefined) {
      result.numFmtId = xf.$.numFmtId;

      if (xf.$.fillId !== undefined) {
        result.background =
          this.data.styleSheet.fills[0].fill[
            NumberUtils.parseInt(xf.$.fillId)!
          ].patternFill[0].fgColor?.[0].$.rgb;
      }

      if (xf.$.borderId !== undefined) {
        const border = this.data.styleSheet.borders[0].border[NumberUtils.parseInt(xf.$.borderId)!];
        if (border.top || border.left || border.right || border.bottom) {
          result.border = [];
          if (border.left) {
            result.border.push("left");
          }
          if (border.right) {
            result.border.push("right");
          }
          if (border.top) {
            result.border.push("top");
          }
          if (border.bottom) {
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
    return this.data.styleSheet.numFmts?.[0].numFmt?.single((item) => item.$.numFmtId === numFmtId)
      ?.$.formatCode;
  }

  private _setNumFmtCode(numFmtCode: string): string {
    // 이미 해당 code가 있으면 넘기기
    const existsNumFmtId = this.data.styleSheet.numFmts?.[0].numFmt?.single(
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

    const maxId =
      this.data.styleSheet.numFmts[0].numFmt.max(
        (item) => NumberUtils.parseInt(item.$.numFmtId) ?? 180,
      ) ?? 180;
    const nextNumFmtId = (maxId + 1).toString();
    this.data.styleSheet.numFmts[0].numFmt.push({
      $: {
        numFmtId: nextNumFmtId.toString(),
        formatCode: numFmtCode,
      },
    });
    this.data.styleSheet.numFmts[0].$.count = (
      NumberUtils.parseInt(this.data.styleSheet.numFmts[0].$.count)! + 1
    ).toString();

    return nextNumFmtId.toString();
  }

  cleanup(): void {
    const result = {} as ISdExcelXmlStyleData["styleSheet"];

    // 순서 정렬 (numFmts 맨위로)

    if (this.data.styleSheet.numFmts) {
      result.numFmts = this.data.styleSheet.numFmts;
    }

    const styleSheetRec = this.data.styleSheet as Record<string, any>;
    const resultRec = result as Record<string, any>;
    for (const key of Object.keys(styleSheetRec)) {
      if (key === "numFmts") continue;

      resultRec[key] = styleSheetRec[key];
    }

    this.data.styleSheet = result;
  }

  private _getSameOrCreateXf(xfItem: ISdExcelXmlStyleDataXf): string {
    const prevSameXf = this.data.styleSheet.cellXfs[0].xf.single((item) =>
      ObjectUtils.equal(item, xfItem),
    );

    if (prevSameXf) {
      return this.data.styleSheet.cellXfs[0].xf.indexOf(prevSameXf).toString();
    } else {
      this.data.styleSheet.cellXfs[0].xf.push(xfItem);
      this.data.styleSheet.cellXfs[0].$.count =
        this.data.styleSheet.cellXfs[0].xf.length.toString();
      return (this.data.styleSheet.cellXfs[0].xf.length - 1).toString();
    }
  }

  private _getSameOrCreateFill(fillItem: ISdExcelXmlStyleDataFill): string {
    const prevSameFill = this.data.styleSheet.fills[0].fill.single((item) =>
      ObjectUtils.equal(item, fillItem),
    );

    if (prevSameFill) {
      return this.data.styleSheet.fills[0].fill.indexOf(prevSameFill).toString();
    } else {
      this.data.styleSheet.fills[0].fill.push(fillItem);
      this.data.styleSheet.fills[0].$.count = this.data.styleSheet.fills[0].fill.length.toString();
      return (this.data.styleSheet.fills[0].fill.length - 1).toString();
    }
  }

  private _getSameOrCreateBorder(borderItem: ISdExcelXmlStyleDataBorder): string {
    const prevSameBorder = this.data.styleSheet.borders[0].border.single((item) =>
      ObjectUtils.equal(item, borderItem),
    );

    if (prevSameBorder) {
      return this.data.styleSheet.borders[0].border.indexOf(prevSameBorder).toString();
    } else {
      this.data.styleSheet.borders[0].border.push(borderItem);
      this.data.styleSheet.borders[0].$.count =
        this.data.styleSheet.borders[0].border.length.toString();
      return (this.data.styleSheet.borders[0].border.length - 1).toString();
    }
  }
}

export interface ISdExcelStyle {
  numFmtId?: string;
  numFmtCode?: string;
  border?: ("left" | "right" | "top" | "bottom")[];
  background?: string;
  verticalAlign?: "center" | "top" | "bottom";
  horizontalAlign?: "center" | "left" | "right";
}
