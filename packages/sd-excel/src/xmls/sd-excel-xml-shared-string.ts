import {
  ISdExcelXml,
  ISdExcelXmlSharedStringData,
  TSdExcelXmlSharedStringData,
  TSdExcelXmlSharedStringDataSi,
} from "../types";

export class SdExcelXmlSharedString implements ISdExcelXml {
  data: ISdExcelXmlSharedStringData;

  private _stringIndexesMap: Map<string, number[]>;

  constructor(data?: ISdExcelXmlSharedStringData) {
    if (data === undefined) {
      this.data = {
        "sst": {
          "$": {
            "xmlns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          },
        },
      };
    }
    else {
      this.data = data;
    }

    this._stringIndexesMap = this.data.sst.si
      ?.map((tag, id) => ({ id, tag }))
      .filter((item) => !this.#getHasInnerStyleOnSiTag(item.tag))
      .toArrayMap(
        (item) => this.#getStringFromSiTag(item.tag),
        (item) => item.id,
      ) ?? new Map<string, number[]>();
  }

  getIdByString(str: string): number | undefined {
    return this._stringIndexesMap.get(str)?.[0];
  }

  getStringById(id: number): string | undefined {
    const si = this.data.sst.si?.[id];
    return si ? this.#getStringFromSiTag(si) : undefined;
  }

  add(str: string): number {
    this.data.sst.si = this.data.sst.si ?? [];
    const newLength = this.data.sst.si.push({ t: [str] });
    const arr = this._stringIndexesMap.getOrCreate(str, []);
    arr.push(newLength - 1);
    return newLength - 1;
  }

  cleanup() {
  }

  #getStringFromSiTag(si: TSdExcelXmlSharedStringDataSi): string {
    if ("t" in si) {
      return this.#getStringFromTTag(si.t);
    }
    else {
      return si.r.map((item) => this.#getStringFromTTag(item.t)).join("");
    }
  }

  #getStringFromTTag(t: TSdExcelXmlSharedStringData): string {
    return typeof t[0] === "string" ? t[0] : (Boolean(t[0]._) ? t[0]._! : " ");
  }

  #getHasInnerStyleOnSiTag(si: TSdExcelXmlSharedStringDataSi): boolean {
    return Object.keys(si).some((item) => item !== "t");
  }
}
