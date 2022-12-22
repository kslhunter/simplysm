import {
  ISdExcelXml,
  ISdExcelXmlSharedStringData,
  TSdExcelXmlSharedStringData,
  TSdExcelXmlSharedStringDataSi
} from "../commons";

export class SdExcelXmlSharedString implements ISdExcelXml {
  public readonly data: ISdExcelXmlSharedStringData;

  private readonly _stringIndexesMap: Map<string, number[]>;

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

    this._stringIndexesMap = this.data.sst.si?.filter((item) => !this._getHasInnerStyleOnSiTag(item)).toArrayMap(
      (item) => this._getStringFromSiTag(item),
      (item, i) => i
    ) ?? new Map<string, number[]>();
  }

  public getIdByString(str: string): number | undefined {
    return this._stringIndexesMap.get(str)?.[0];
  }

  public getStringById(id: number): string | undefined {
    const si = this.data.sst.si?.[id];
    return si ? this._getStringFromSiTag(si) : undefined;
  }

  public add(str: string): number {
    this.data.sst.si = this.data.sst.si ?? [];
    this.data.sst.si.push({ t: [str] });
    const arr = this._stringIndexesMap.getOrCreate(str, []);
    arr.push(this.data.sst.si.length - 1);
    return this.data.sst.si.length - 1;
  }

  public cleanup(): void {
  }

  private _getStringFromSiTag(si: TSdExcelXmlSharedStringDataSi): string {
    if ("t" in si) {
      return this._getStringFromTTag(si.t);
    }
    else {
      return si.r.map((item) => this._getStringFromTTag(item.t)).join("");
    }
  }

  private _getStringFromTTag(t: TSdExcelXmlSharedStringData): string {
    return typeof t[0] === "string" ? t[0] : (Boolean(t[0]._) ? t[0]._! : "");
  }

  private _getHasInnerStyleOnSiTag(si: TSdExcelXmlSharedStringDataSi): boolean {
    return Object.keys(si).some((item) => item !== "t");
  }
}
