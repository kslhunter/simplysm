import { ISdExcelXml, ISdExcelXmlStyleData, ISdExcelXmlStyleDataXf, TSdExcelNumberFormat } from "../commons";
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

  public add(style: { valueType: TSdExcelNumberFormat }): string {
    const newItem = { "$": { "numFmtId": this._convertValueTypeToNumFmtId(style.valueType) } };
    return this._getSameOrCreateXf(newItem);
  }

  public addWithClone(id: string, style: { valueType: TSdExcelNumberFormat }): string {
    const prevItem = this.data.styleSheet.cellXfs[0].xf[NumberUtil.parseInt(id)!];
    const numFmtId = this._convertValueTypeToNumFmtId(style.valueType);
    const cloneItem = ObjectUtil.clone(prevItem);
    cloneItem.$.numFmtId = numFmtId;

    return this._getSameOrCreateXf(cloneItem);
  }

  public get(id: string): { valueType: TSdExcelNumberFormat } {
    return { valueType: this._getValueTypeNameById(id) };
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

  private _getValueTypeNameById(id: string): TSdExcelNumberFormat {
    const numFmtId = NumberUtil.parseInt(this.data.styleSheet.cellXfs[0].xf[NumberUtil.parseInt(id)!]?.$.numFmtId)!;
    if (
      numFmtId <= 13 ||
      (numFmtId >= 37 && numFmtId <= 40) ||
      numFmtId === 48
    ) {
      return "number";
    }
    else if (
      (numFmtId >= 14 && numFmtId <= 17) ||
      (numFmtId >= 27 && numFmtId <= 31) ||
      (numFmtId >= 34 && numFmtId <= 36) ||
      (numFmtId >= 50 && numFmtId <= 58)
    ) {
      return "DateOnly";
    }
    else if (numFmtId === 22) {
      return "DateTime";
    }
    else if (
      (numFmtId >= 18 && numFmtId <= 21) ||
      (numFmtId >= 32 && numFmtId <= 33) ||
      (numFmtId >= 45 && numFmtId <= 47)
    ) {
      return "Time";
    }
    else if (numFmtId === 49) {
      return "string";
    }
    else {
      throw new Error("[numFmtId: " + numFmtId + "]에 대한 형식을 알 수 없습니다.");
    }
  }

  private _convertValueTypeToNumFmtId(valueType: TSdExcelNumberFormat): string {
    if (valueType === "number") {
      return "0";
    }
    else if (valueType === "DateOnly") {
      return "14";
    }
    else if (valueType === "DateTime") {
      return "22";
    }
    else if (valueType === "Time") {
      return "18";
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    else if (valueType === "string") {
      return "49";
    }
    else {
      throw new Error("'" + valueType + "'에 대한 'numFmtId'를 알 수 없습니다.");
    }
  }
}
