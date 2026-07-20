import type { Bytes } from "@simplysm/core-common";
import { xml as xmlU } from "@simplysm/core-common";
import type { ISharedStringModel } from "../models/i-shared-string-model";
import type {
  ExcelXmlSharedStringData,
  ExcelXmlSharedStringDataSi,
  ExcelXmlSharedStringDataText,
} from "../types";
import "@simplysm/core-common";

/**
 * xl/sharedStrings.xml을 관리하는 클래스.
 * 문자열 중복을 방지하여 파일 크기를 최적화한다.
 */
export class ExcelXmlSharedString implements ISharedStringModel {
  private readonly _data: ExcelXmlSharedStringData;

  private readonly _stringIndexesMap: Map<string, number[]>;

  constructor(data?: ExcelXmlSharedStringData) {
    if (data == null) {
      this._data = {
        sst: {
          $: {
            xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          },
        },
      };
    } else {
      this._data = data;
    }

    this._stringIndexesMap = this._data.sst.si
      ? this._data.sst.si
          .map((tag, id) => ({ id, tag }))
          .filter((item) => !this._getHasInnerStyleOnSiTag(item.tag))
          .toArrayMap(
            (item) => this._getStringFromSiTag(item.tag),
            (item) => item.id,
          )
      : new Map<string, number[]>();
  }

  /** @internal 테스트, 디버그용 내부 트리 접근. 상위 레이어는 인터페이스만 사용. */
  get data(): ExcelXmlSharedStringData {
    return this._data;
  }

  getIdByString(str: string): number | undefined {
    return this._stringIndexesMap.get(str)?.[0];
  }

  getStringById(id: number): string | undefined {
    const si = this._data.sst.si?.[id];
    return si != null ? this._getStringFromSiTag(si) : undefined;
  }

  add(str: string): number {
    this._data.sst.si = this._data.sst.si ?? [];
    const newLength = this._data.sst.si.push({ t: [str] });
    const arr = this._stringIndexesMap.getOrCreate(str, []);
    arr.push(newLength - 1);
    return newLength - 1;
  }

  serialize(): Bytes {
    return new TextEncoder().encode(xmlU.stringify(this._data));
  }

  private _getStringFromSiTag(si: ExcelXmlSharedStringDataSi): string {
    if ("t" in si) {
      return this._getStringFromTTag(si.t);
    } else {
      return si.r.map((item) => this._getStringFromTTag(item.t)).join("");
    }
  }

  private _getStringFromTTag(t: ExcelXmlSharedStringDataText): string {
    const firstItem = t[0];
    if (typeof firstItem === "string") {
      return firstItem;
    }
    return firstItem._ ?? "";
  }

  private _getHasInnerStyleOnSiTag(si: ExcelXmlSharedStringDataSi): boolean {
    return Object.keys(si).some((item) => item !== "t");
  }
}
