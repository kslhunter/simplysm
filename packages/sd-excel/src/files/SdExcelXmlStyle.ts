import {ISdExcelXml, ISdExcelXmlStyleData, ISdExcelXmlStyleDataFill, ISdExcelXmlStyleDataXf} from "../commons";
import {NumberUtil, ObjectUtil} from "@simplysm/sd-core-common";

export class SdExcelXmlStyle implements ISdExcelXml {
  public readonly data: ISdExcelXmlStyleData;

  public constructor(data?: ISdExcelXmlStyleData) {
    if (data === undefined) {
      this.data = {
        "styleSheet": {
          "$": {
            "xmlns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          },
          "fonts": [{
            "$": {count: "1"},
            "font": [{}]
          }],
          "fills": [{
            "$": {count: "1"},
            "fill": [
              {patternFill: [{$: {patternType: "none"}}]},
              {patternFill: [{$: {patternType: "gray125"}}]}
            ]
          }],
          "borders": [{
            "$": {count: "1"},
            "border": [{}]
          }],
          "cellXfs": [{
            "$": {count: "1"},
            "xf": [{"$": {numFmtId: "0"}}]
          }]
        }
      };
    }
    else {
      this.data = data;
    }
  }

  public add(style: ISdExcelStyle): string {
    const newXf: ISdExcelXmlStyleDataXf = {"$": {}};

    if (style.numFmtId !== undefined) {
      newXf.$.numFmtId = style.numFmtId;
    }

    if (style.background !== undefined) {
      const newFill: ISdExcelXmlStyleDataFill = {
        "patternFill": [
          {
            "$": {"patternType": "solid"},
            "fgColor": [{"$": {"rgb": style.background.toUpperCase()}}]
          }
        ]
      };

      newXf.$.applyFill = "1";
      newXf.$.fillId = this._getSameOrCreateFill(newFill);
    }

    if (style.verticalAlign !== undefined) {
      newXf.$.applyAlignment = "1";
      if (!newXf.alignment) {
        newXf.alignment = [{"$": {vertical: style.verticalAlign}}];
      }
      else {
        newXf.alignment[0].$.vertical = style.verticalAlign;
      }
    }

    if (style.horizontalAlign !== undefined) {
      newXf.$.applyAlignment = "1";
      if (!newXf.alignment) {
        newXf.alignment = [{"$": {horizontal: style.horizontalAlign}}];
      }
      else {
        newXf.alignment[0].$.horizontal = style.horizontalAlign;
      }
    }

    return this._getSameOrCreateXf(newXf);
  }

  public addWithClone(id: string, style: ISdExcelStyle): string {
    const prevXf = this.data.styleSheet.cellXfs[0].xf[NumberUtil.parseInt(id)!];
    const cloneXf = ObjectUtil.clone(prevXf);

    if (style.numFmtId !== undefined) {
      cloneXf.$.numFmtId = style.numFmtId;
    }

    if (style.background !== undefined) {
      const prevFill = cloneXf.$.fillId !== undefined
        ? this.data.styleSheet.fills[0].fill[NumberUtil.parseInt(cloneXf.$.fillId)!]
        : undefined;

      if (prevFill) {
        const cloneFill = ObjectUtil.clone(prevFill);
        if (!cloneFill.patternFill[0].fgColor) {
          cloneFill.patternFill[0].fgColor = [{$: {rgb: style.background}}];
        }
        else {
          cloneFill.patternFill[0].fgColor[0].$.rgb = style.background;
        }

        cloneXf.$.applyFill = "1";
        cloneXf.$.fillId = this._getSameOrCreateFill(cloneFill);
        return this._getSameOrCreateXf(cloneXf);
      }
      else {
        const newFill: ISdExcelXmlStyleDataFill = {
          "patternFill": [
            {
              "$": {"patternType": "solid"},
              "fgColor": [{"$": {"rgb": style.background.toUpperCase()}}]
            }
          ]
        };
        cloneXf.$.applyFill = "1";
        cloneXf.$.fillId = this._getSameOrCreateFill(newFill);
        return this._getSameOrCreateXf(cloneXf);
      }
    }

    if (style.verticalAlign !== undefined) {
      cloneXf.$.applyAlignment = "1";
      if (!cloneXf.alignment) {
        cloneXf.alignment = [{"$": {vertical: style.verticalAlign}}];
      }
      else {
        cloneXf.alignment[0].$.vertical = style.verticalAlign;
      }
    }

    if (style.horizontalAlign !== undefined) {
      cloneXf.$.applyAlignment = "1";
      if (!cloneXf.alignment) {
        cloneXf.alignment = [{"$": {horizontal: style.horizontalAlign}}];
      }
      else {
        cloneXf.alignment[0].$.horizontal = style.horizontalAlign;
      }
    }

    return this._getSameOrCreateXf(cloneXf);
  }

  public get(id: string): ISdExcelStyle {
    const xf = this.data.styleSheet.cellXfs[0].xf[NumberUtil.parseInt(id)!] as ISdExcelXmlStyleDataXf | undefined;

    const result: ISdExcelStyle = {};

    if (xf !== undefined) {
      result.numFmtId = xf.$.numFmtId;

      if (xf.$.fillId !== undefined) {
        result.background = this.data.styleSheet.fills[0].fill[NumberUtil.parseInt(xf.$.fillId)!].patternFill[0].fgColor?.[0].$.rgb;
      }

      result.verticalAlign = xf.alignment?.[0].$.vertical;
      result.horizontalAlign = xf.alignment?.[0].$.horizontal;
    }

    return result;
  }

  public getNumFmtCode(numFmtId: string): string | undefined {
    return this.data.styleSheet.numFmts?.[0].numFmt?.single((item) => item.$.numFmtId === numFmtId)?.$.formatCode;
  }

  public cleanup(): void {
  }

  private _getSameOrCreateXf(xfItem: ISdExcelXmlStyleDataXf): string {
    const prevSameXf = this.data.styleSheet.cellXfs[0].xf.single((item) => ObjectUtil.equal(item, xfItem));

    if (prevSameXf) {
      return this.data.styleSheet.cellXfs[0].xf.indexOf(prevSameXf).toString();
    }
    else {
      this.data.styleSheet.cellXfs[0].xf.push(xfItem);
      this.data.styleSheet.cellXfs[0].$.count = this.data.styleSheet.cellXfs[0].xf.length.toString();
      return (this.data.styleSheet.cellXfs[0].xf.length - 1).toString();
    }
  }


  private _getSameOrCreateFill(fillItem: ISdExcelXmlStyleDataFill): string {
    const prevSameFill = this.data.styleSheet.fills[0].fill.single((item) => ObjectUtil.equal(item, fillItem));

    if (prevSameFill) {
      return this.data.styleSheet.fills[0].fill.indexOf(prevSameFill).toString();
    }
    else {
      this.data.styleSheet.fills[0].fill.push(fillItem);
      this.data.styleSheet.fills[0].$.count = this.data.styleSheet.fills[0].fill.length.toString();
      return (this.data.styleSheet.fills[0].fill.length - 1).toString();
    }
  }
}

export interface ISdExcelStyle {
  numFmtId?: string;
  background?: string;
  verticalAlign?: "center" | "top" | "bottom";
  horizontalAlign?: "center" | "left" | "right";
}
