import type { Bytes } from "@simplysm/core-common";
import { num, obj, xml as xmlU } from "@simplysm/core-common";
import "@simplysm/core-common";
import type { IStyleModel } from "../models/i-style-model";
import { convertExcelStyleOptions, type ExcelStyle } from "../models/shared/excel-style";
import type {
  ExcelConditionalRuleStyle,
  ExcelFont,
  ExcelXmlStyleData,
  ExcelXmlStyleDataBorder,
  ExcelXmlStyleDataDxf,
  ExcelXmlStyleDataFill,
  ExcelXmlStyleDataFont,
  ExcelXmlStyleDataXf,
} from "../types";
import type { ExcelBorderPosition } from "../types";

// 구현 중립 위치(models/shared)로 이전. 기존 import 경로 호환을 위해 re-export 유지.
export { convertExcelStyleOptions, type ExcelStyle };

/**
 * xl/styles.xml을 관리하는 클래스.
 * 숫자 형식, 배경색, 테두리, 정렬 등의 스타일을 처리한다.
 */
export class ExcelXmlStyle implements IStyleModel {
  private readonly _data: ExcelXmlStyleData;

  constructor(data?: ExcelXmlStyleData) {
    if (data == null) {
      this._data = {
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
      this._data = data;
    }
  }

  /** @internal 테스트, 디버그용 내부 트리 접근. 상위 레이어는 인터페이스만 사용. */
  get data(): ExcelXmlStyleData {
    return this._data;
  }

  add(style: ExcelStyle): string {
    const newXf: ExcelXmlStyleDataXf = { $: {} };
    this._applyStyleToXf(newXf, style);
    return this._getSameOrCreateXf(newXf);
  }

  /**
   * 워크북 default cell style 설정. `fonts[0]` / `fills[0]` / `borders[0]` (OOXML default 자원 슬롯) 자체를
   * 입력 옵션으로 덮어쓴다. 셀의 xf 가 fontId/fillId/borderId 를 명시하지 않으면 OOXML 스펙상 이 0번 슬롯이
   * 자동 fallback 되므로, "표준" 셀 스타일이 워크북 전역에 적용된다.
   *
   * `cellXfs[0].xf[0]` 에는 numFmtId, alignment 만 박는다 (fontId/fillId/borderId 는 명시하지 않음).
   * 옵션이 없는 자원은 0번 슬롯이 빈 슬롯 (`{}` / patternType="none") 으로 reset 된다.
   * 미호출 시 기존 cellXfs[0], 0번 슬롯 모두 그대로 보존된다.
   */
  setDefaultStyle(style: ExcelStyle): void {
    this._data.styleSheet.fonts[0].font[0] = {};
    this._data.styleSheet.fills[0].fill[0] = { patternFill: [{ $: { patternType: "none" } }] };
    this._data.styleSheet.borders[0].border[0] = {};

    if (style.font != null) {
      this._validateFont(style.font);
      this._data.styleSheet.fonts[0].font[0] = this._buildFontXml(style.font);
    }

    if (style.background != null) {
      this._data.styleSheet.fills[0].fill[0] = {
        patternFill: [
          {
            $: { patternType: "solid" },
            fgColor: [{ $: { rgb: style.background.toUpperCase() } }],
          },
        ],
      };
    }

    if (style.border != null) {
      this._data.styleSheet.borders[0].border[0] = this._createBorderFromPositions(style.border);
    }

    const newXf: ExcelXmlStyleDataXf = { $: { numFmtId: "0" } };

    if (style.numFmtId != null) {
      newXf.$.numFmtId = style.numFmtId;
    }

    if (style.numFmtCode != null) {
      newXf.$.numFmtId = this._setNumFmtCode(style.numFmtCode);
      newXf.$.applyNumberFormat = "1";
    }

    this._applyAlignment(newXf, style);
    this._data.styleSheet.cellXfs[0].xf[0] = newXf;
  }

  addWithClone(id: string, style: ExcelStyle): string {
    const idNum = num.parseInt(id);
    if (idNum == null) {
      throw new Error(`잘못된 스타일 ID: ${id}`);
    }
    const xfArray = this._data.styleSheet.cellXfs[0].xf;
    if (idNum < 0 || idNum >= xfArray.length) {
      throw new Error(`존재하지 않는 스타일 ID: ${id} (범위: 0-${xfArray.length - 1})`);
    }
    const prevXf = xfArray[idNum];
    const cloneXf = obj.clone(prevXf);

    if (style.numFmtId != null) {
      cloneXf.$.numFmtId = style.numFmtId;
    }

    if (style.numFmtCode != null) {
      cloneXf.$.numFmtId = this._setNumFmtCode(style.numFmtCode);
      cloneXf.$.applyNumberFormat = "1";
    }

    if (style.background != null) {
      const fillIdNum = cloneXf.$.fillId != null ? num.parseInt(cloneXf.$.fillId) : undefined;
      const prevFill =
        fillIdNum != null ? this._data.styleSheet.fills[0].fill[fillIdNum] : undefined;

      if (prevFill != null) {
        const cloneFill = obj.clone(prevFill);
        cloneFill.patternFill[0].$.patternType = "solid";

        if (cloneFill.patternFill[0].fgColor == null) {
          cloneFill.patternFill[0].fgColor = [{ $: { rgb: style.background.toUpperCase() } }];
        } else {
          cloneFill.patternFill[0].fgColor[0].$.rgb = style.background.toUpperCase();
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

    if (style.border != null) {
      const borderIdNum =
        cloneXf.$.borderId != null ? num.parseInt(cloneXf.$.borderId) : undefined;
      const prevBorder =
        borderIdNum != null ? this._data.styleSheet.borders[0].border[borderIdNum] : undefined;

      if (prevBorder != null) {
        const cloneBorder = obj.clone(prevBorder);
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

    if (style.font != null) {
      this._validateFont(style.font);
      cloneXf.$.applyFont = "1";
      cloneXf.$.fontId = this._getSameOrCreateFont(this._buildFontXml(style.font));
    }

    this._applyAlignment(cloneXf, style);

    return this._getSameOrCreateXf(cloneXf);
  }

  get(id: string): ExcelStyle {
    const idNum = num.parseInt(id);
    if (idNum == null) {
      throw new Error(`잘못된 스타일 ID: ${id}`);
    }
    const xf = this._data.styleSheet.cellXfs[0].xf[idNum] as ExcelXmlStyleDataXf | undefined;

    const result: ExcelStyle = {};

    if (xf != null) {
      result.numFmtId = xf.$.numFmtId;

      if (xf.$.fillId != null) {
        const fillIdNum = num.parseInt(xf.$.fillId);
        if (fillIdNum != null) {
          const fill = this._data.styleSheet.fills[0].fill[fillIdNum] as
            | ExcelXmlStyleDataFill
            | undefined;
          if (fill == null) {
            throw new Error(
              `존재하지 않는 fill ID: ${xf.$.fillId} (범위: 0-${this._data.styleSheet.fills[0].fill.length - 1})`,
            );
          }
          result.background = fill.patternFill[0].fgColor?.[0].$.rgb;
        }
      }

      if (xf.$.borderId != null) {
        const borderIdNum = num.parseInt(xf.$.borderId);
        if (borderIdNum == null) {
          throw new Error(`잘못된 border ID: ${xf.$.borderId}`);
        }
        const border = this._data.styleSheet.borders[0].border[borderIdNum] as
          | ExcelXmlStyleDataBorder
          | undefined;
        if (border == null) {
          throw new Error(
            `존재하지 않는 border ID: ${xf.$.borderId} (범위: 0-${this._data.styleSheet.borders[0].border.length - 1})`,
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

      if (xf.$.fontId != null) {
        const fontIdNum = num.parseInt(xf.$.fontId);
        if (fontIdNum != null) {
          const font = this._data.styleSheet.fonts[0].font[fontIdNum] as
            | ExcelXmlStyleDataFont
            | undefined;
          if (font != null) {
            const parsed = this._parseFontXml(font);
            if (Object.keys(parsed).length > 0) {
              result.font = parsed;
            }
          }
        }
      }
    }

    return result;
  }

  addDxf(style: ExcelConditionalRuleStyle): string {
    const dxfItem: ExcelXmlStyleDataDxf = {};

    if (style.fontColor != null || style.fontWeight != null) {
      const font: NonNullable<ExcelXmlStyleDataDxf["font"]>[number] = {};
      if (style.fontWeight != null) {
        font.b = [{ $: { val: style.fontWeight === "bold" ? "1" : "0" } }];
      }
      if (style.fontColor != null) {
        font.color = [{ $: { rgb: style.fontColor.toUpperCase() } }];
      }
      dxfItem.font = [font];
    }

    if (style.background != null) {
      dxfItem.fill = [
        {
          patternFill: [
            {
              $: { patternType: "solid" },
              bgColor: [{ $: { rgb: style.background.toUpperCase() } }],
            },
          ],
        },
      ];
    }

    const dxfs = (this._data.styleSheet.dxfs = this._data.styleSheet.dxfs ?? [
      { $: { count: "0" }, dxf: [] },
    ]);

    const prevSameDxf = dxfs[0].dxf.single((item) => obj.equal(item, dxfItem));
    if (prevSameDxf != null) {
      return dxfs[0].dxf.indexOf(prevSameDxf).toString();
    }

    dxfs[0].dxf.push(dxfItem);
    dxfs[0].$.count = dxfs[0].dxf.length.toString();
    return (dxfs[0].dxf.length - 1).toString();
  }

  getNumFmtCode(numFmtId: string): string | undefined {
    return (this._data.styleSheet.numFmts?.[0].numFmt ?? []).single(
      (item) => item.$.numFmtId === numFmtId,
    )?.$.formatCode;
  }

  serialize(): Bytes {
    this._cleanup();
    return new TextEncoder().encode(xmlU.stringify(this._data));
  }

  private _cleanup(): void {
    const result = {} as ExcelXmlStyleData["styleSheet"];

    // 정렬 순서 (numFmts를 먼저)

    if (this._data.styleSheet.numFmts != null) {
      result.numFmts = this._data.styleSheet.numFmts;
    }

    const styleSheetRec = this._data.styleSheet as Record<string, unknown>;
    const resultRec = result as Record<string, unknown>;
    for (const key of Object.keys(styleSheetRec)) {
      if (key === "numFmts") continue;

      resultRec[key] = styleSheetRec[key];
    }

    this._data.styleSheet = result;
  }

  //#region Private Methods

  private _setNumFmtCode(numFmtCode: string): string {
    // 코드가 이미 존재하면 건너뛰기
    const existsNumFmtId = (this._data.styleSheet.numFmts?.[0].numFmt ?? []).single(
      (item) => item.$.formatCode === numFmtCode,
    )?.$.numFmtId;
    if (existsNumFmtId != null) {
      return existsNumFmtId;
    }

    this._data.styleSheet.numFmts = this._data.styleSheet.numFmts ?? [
      {
        $: { count: "0" },
        numFmt: [],
      },
    ];

    this._data.styleSheet.numFmts[0].numFmt = this._data.styleSheet.numFmts[0].numFmt ?? [];

    // Excel 사용자 정의 숫자 형식은 ID 180+부터 시작 (0-163: 내장, 164-179: 예약)
    const numFmts = this._data.styleSheet.numFmts[0].numFmt;
    const maxItem =
      numFmts.length > 0
        ? numFmts.orderByDesc((item) => num.parseInt(item.$.numFmtId) ?? 180).first()
        : undefined;
    const maxId = maxItem ? (num.parseInt(maxItem.$.numFmtId) ?? 180) : 180;
    const nextNumFmtId = (maxId + 1).toString();
    this._data.styleSheet.numFmts[0].numFmt.push({
      $: {
        numFmtId: nextNumFmtId,
        formatCode: numFmtCode,
      },
    });
    this._data.styleSheet.numFmts[0].$.count = (
      (num.parseInt(this._data.styleSheet.numFmts[0].$.count) ?? 0) + 1
    ).toString();

    return nextNumFmtId;
  }

  private _applyStyleToXf(xf: ExcelXmlStyleDataXf, style: ExcelStyle): void {
    if (style.numFmtId != null) {
      xf.$.numFmtId = style.numFmtId;
    }

    if (style.numFmtCode != null) {
      xf.$.numFmtId = this._setNumFmtCode(style.numFmtCode);
      xf.$.applyNumberFormat = "1";
    }

    if (style.background != null) {
      const newFill: ExcelXmlStyleDataFill = {
        patternFill: [
          {
            $: { patternType: "solid" },
            fgColor: [{ $: { rgb: style.background.toUpperCase() } }],
          },
        ],
      };
      xf.$.applyFill = "1";
      xf.$.fillId = this._getSameOrCreateFill(newFill);
    }

    if (style.border != null) {
      const newBorder = this._createBorderFromPositions(style.border);
      xf.$.applyBorder = "1";
      xf.$.borderId = this._getSameOrCreateBorder(newBorder);
    }

    if (style.font != null) {
      this._validateFont(style.font);
      xf.$.applyFont = "1";
      xf.$.fontId = this._getSameOrCreateFont(this._buildFontXml(style.font));
    }

    this._applyAlignment(xf, style);
  }

  private _validateFont(font: ExcelFont): void {
    if (font.color != null && !/^[0-9A-F]{8}$/i.test(font.color)) {
      throw new Error("잘못된 폰트 색상 형식입니다. (형식: 00000000: alpha(반전)+rgb)");
    }
  }

  private _buildFontXml(font: ExcelFont): ExcelXmlStyleDataFont {
    const result: ExcelXmlStyleDataFont = {};
    if (font.size != null) {
      result.sz = [{ $: { val: font.size.toString() } }];
    }
    if (font.family != null) {
      result.name = [{ $: { val: font.family } }];
    }
    if (font.bold === true) {
      result.b = [{}];
    }
    if (font.italic === true) {
      result.i = [{}];
    }
    if (font.underline != null) {
      result.u = [{ $: { val: font.underline } }];
    }
    if (font.strike === true) {
      result.strike = [{}];
    }
    if (font.color != null) {
      result.color = [{ $: { rgb: font.color.toUpperCase() } }];
    }
    return result;
  }

  private _parseFontXml(item: ExcelXmlStyleDataFont): ExcelFont {
    const result: ExcelFont = {};
    if (item.sz?.[0].$.val != null) {
      const sz = num.parseFloat(item.sz[0].$.val);
      if (sz != null) result.size = sz;
    }
    if (item.name?.[0].$.val != null) {
      result.family = item.name[0].$.val;
    }
    if (item.b != null) result.bold = true;
    if (item.i != null) result.italic = true;
    if (item.u != null) {
      result.underline = item.u[0].$?.val ?? "single";
    }
    if (item.strike != null) result.strike = true;
    if (item.color?.[0].$.rgb != null) {
      result.color = item.color[0].$.rgb;
    }
    return result;
  }

  private _getSameOrCreateFont(item: ExcelXmlStyleDataFont): string {
    const prevSameFont = this._data.styleSheet.fonts[0].font.single((f) => obj.equal(f, item));
    if (prevSameFont != null) {
      return this._data.styleSheet.fonts[0].font.indexOf(prevSameFont).toString();
    } else {
      this._data.styleSheet.fonts[0].font.push(item);
      this._data.styleSheet.fonts[0].$.count = this._data.styleSheet.fonts[0].font.length.toString();
      return (this._data.styleSheet.fonts[0].font.length - 1).toString();
    }
  }

  private _applyAlignment(xf: ExcelXmlStyleDataXf, style: ExcelStyle): void {
    if (style.verticalAlign != null) {
      xf.$.applyAlignment = "1";
      if (xf.alignment == null) {
        xf.alignment = [{ $: { vertical: style.verticalAlign } }];
      } else {
        xf.alignment[0].$.vertical = style.verticalAlign;
      }
    }

    if (style.horizontalAlign != null) {
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
    const prevSameXf = this._data.styleSheet.cellXfs[0].xf.single((item) => obj.equal(item, xfItem));

    if (prevSameXf != null) {
      return this._data.styleSheet.cellXfs[0].xf.indexOf(prevSameXf).toString();
    } else {
      this._data.styleSheet.cellXfs[0].xf.push(xfItem);
      this._data.styleSheet.cellXfs[0].$.count =
        this._data.styleSheet.cellXfs[0].xf.length.toString();
      return (this._data.styleSheet.cellXfs[0].xf.length - 1).toString();
    }
  }

  private _getSameOrCreateFill(fillItem: ExcelXmlStyleDataFill): string {
    const prevSameFill = this._data.styleSheet.fills[0].fill.single((item) =>
      obj.equal(item, fillItem),
    );

    if (prevSameFill != null) {
      return this._data.styleSheet.fills[0].fill.indexOf(prevSameFill).toString();
    } else {
      this._data.styleSheet.fills[0].fill.push(fillItem);
      this._data.styleSheet.fills[0].$.count = this._data.styleSheet.fills[0].fill.length.toString();
      return (this._data.styleSheet.fills[0].fill.length - 1).toString();
    }
  }

  private _getSameOrCreateBorder(borderItem: ExcelXmlStyleDataBorder): string {
    const prevSameBorder = this._data.styleSheet.borders[0].border.single((item) =>
      obj.equal(item, borderItem),
    );

    if (prevSameBorder != null) {
      return this._data.styleSheet.borders[0].border.indexOf(prevSameBorder).toString();
    } else {
      this._data.styleSheet.borders[0].border.push(borderItem);
      this._data.styleSheet.borders[0].$.count =
        this._data.styleSheet.borders[0].border.length.toString();
      return (this._data.styleSheet.borders[0].border.length - 1).toString();
    }
  }

  //#endregion
}
