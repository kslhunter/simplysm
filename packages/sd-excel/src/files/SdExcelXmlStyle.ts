import { ISdExcelXml, ISdExcelXmlStyleData, ISdExcelXmlStyleDataXf } from "../commons";
import { NumberUtil, ObjectUtil } from "@simplysm/sd-core-common";

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
            "$": { count: "1" },
            "font": [{}]
          }],
          "fills": [{
            "$": { count: "1" },
            "fill": [{}]
          }],
          "borders": [{
            "$": { count: "1" },
            "border": [{}]
          }],
          "cellXfs": [{
            "$": { count: "1" },
            "xf": [{ "$": { numFmtId: "0" } }]
          }]
        }
      };
    }
    else {
      this.data = data;
    }
  }

  public add(style: { numFmtId: string }): string {
    const newItem = { "$": { "numFmtId": style.numFmtId } };
    return this._getSameOrCreateXf(newItem);
  }

  public addWithClone(id: string, style: { numFmtId: string }): string {
    const prevItem = this.data.styleSheet.cellXfs[0].xf[NumberUtil.parseInt(id)!];
    const cloneItem = ObjectUtil.clone(prevItem);
    cloneItem.$.numFmtId = style.numFmtId;

    return this._getSameOrCreateXf(cloneItem);
  }

  public get(id: string): { numFmtId: string | undefined } {
    return {
      numFmtId: this.data.styleSheet.cellXfs[0].xf[NumberUtil.parseInt(id)!]?.$.numFmtId
    };
  }

  public getNumFmtCode(numFmtId: string): string | undefined {
    return this.data.styleSheet.numFmts?.[0].numFmt?.single((item) => item.$.numFmtId === numFmtId)?.$.formatCode;
  }

  public cleanup(): void {
  }

  private _getSameOrCreateXf(xfItem: ISdExcelXmlStyleDataXf): string {
    const prevSameItem = this.data.styleSheet.cellXfs[0].xf.single((item) => ObjectUtil.equal(item, xfItem));

    if (prevSameItem) {
      return this.data.styleSheet.cellXfs[0].xf.indexOf(prevSameItem).toString();
    }
    else {
      this.data.styleSheet.cellXfs[0].xf.push(xfItem);
      this.data.styleSheet.cellXfs[0].$.count = this.data.styleSheet.cellXfs[0].xf.length.toString();
      return (this.data.styleSheet.cellXfs[0].xf.length - 1).toString();
    }
  }
}
