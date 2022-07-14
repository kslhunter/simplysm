import { ISdExcelXml, ISdExcelXmlSharedStringData } from "../commons";

export class SdExcelXmlSharedString implements ISdExcelXml {
  public readonly data: ISdExcelXmlSharedStringData;

  private readonly _stringMap: Map<string, number>;

  public constructor(data?: ISdExcelXmlSharedStringData) {
    if (data === undefined) {
      this.data = {
        "sst": {
          "$": {
            "xmlns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          }
        }
      };
    }
    else {
      this.data = data;
    }

    this._stringMap = this.data.sst.si?.toMap((item) => item.t[0], (item, i) => i) ?? new Map<string, number>();
  }

  public getIdByString(str: string): number | undefined {
    return this._stringMap.get(str);
  }

  public getStringById(id: number): string | undefined {
    return this.data.sst.si?.[id].t[0];
  }

  public add(str: string): number {
    this.data.sst.si = this.data.sst.si ?? [];
    this.data.sst.si.push({ t: [str] });
    return this.data.sst.si.length - 1;
  }
}
