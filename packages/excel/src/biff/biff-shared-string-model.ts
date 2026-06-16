import type { Bytes } from "@simplysm/core-common";
import type { ISharedStringModel } from "../models/i-shared-string-model";
import { concatBytes, REC } from "./biff12-codec";
import {
  encodeBrtBeginSst,
  encodeBrtSSTItem,
  encodeMarker,
  readSharedStrings,
} from "./biff-records";

/** sharedStrings.bin (BIFF12) 읽기/쓰기 모델. */
export class BiffSharedStringModel implements ISharedStringModel {
  private readonly _strings: string[];
  private readonly _indexMap = new Map<string, number>();

  constructor(bytes?: Bytes) {
    this._strings = bytes != null ? readSharedStrings(bytes) : [];
    for (let i = 0; i < this._strings.length; i++) {
      if (!this._indexMap.has(this._strings[i])) {
        this._indexMap.set(this._strings[i], i);
      }
    }
  }

  getStringById(id: number): string | undefined {
    return this._strings[id];
  }

  getIdByString(str: string): number | undefined {
    return this._indexMap.get(str);
  }

  add(str: string): number {
    const existing = this._indexMap.get(str);
    if (existing != null) return existing;
    const idx = this._strings.length;
    this._strings.push(str);
    this._indexMap.set(str, idx);
    return idx;
  }

  serialize(): Bytes {
    const parts: Uint8Array[] = [
      encodeBrtBeginSst(this._strings.length, this._strings.length),
    ];
    for (const s of this._strings) {
      parts.push(encodeBrtSSTItem(s));
    }
    parts.push(encodeMarker(REC.BrtEndSst));
    return concatBytes(parts);
  }
}
