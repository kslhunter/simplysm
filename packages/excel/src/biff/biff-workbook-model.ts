import { bytes as bytesUtil, type Bytes } from "@simplysm/core-common";
import type { IWorkbookModel } from "../models/i-workbook-model";
import { REC } from "./biff12-codec";
import {
  encodeBrtBookView,
  encodeBrtBundleSh,
  encodeBrtFileVersion,
  encodeBrtWbProp,
  encodeMarker,
  parseRelId,
  readWorkbookSheets,
} from "./biff-records";

const WRITE_NOT_SUPPORTED = "xlsb 쓰기는 아직 지원되지 않습니다 (Stage 3 이후 예정).";

/** workbook.bin (BIFF12) 읽기 모델. 시트 목록·관계 ID 조회. */
export class BiffWorkbookModel implements IWorkbookModel {
  private readonly _sheets: { name: string; relId: string }[];

  constructor(bytes?: Bytes) {
    this._sheets = bytes != null ? readWorkbookSheets(bytes) : [];
  }

  get sheetNames(): string[] {
    return this._sheets.map((s) => s.name);
  }

  get lastWsRelId(): number | undefined {
    let max: number | undefined;
    for (const s of this._sheets) {
      const n = parseRelId(s.relId);
      if (n != null && (max == null || n > max)) max = n;
    }
    return max;
  }

  getWsRelIdByName(name: string): number | undefined {
    const s = this._sheets.find((x) => x.name === name);
    return s != null ? parseRelId(s.relId) : undefined;
  }

  getWsRelIdByIndex(index: number): number | undefined {
    if (index < 0 || index >= this._sheets.length) return undefined;
    return parseRelId(this._sheets[index].relId);
  }

  getWorksheetNameById(id: number): string | undefined {
    const s = this._sheets.find((x) => parseRelId(x.relId) === id);
    return s?.name;
  }

  addWorksheet(name: string): this {
    const relId = (this.lastWsRelId ?? 0) + 1;
    this._sheets.push({ name, relId: `rId${relId}` });
    return this;
  }

  setWorksheetNameById(): void {
    throw new Error(WRITE_NOT_SUPPORTED);
  }

  initializeView(): void {
    // xlsb 는 별도 bookView 초기화가 필요 없다(기본 bookView 사용). no-op.
  }

  serialize(): Bytes {
    const parts: Uint8Array[] = [
      encodeMarker(REC.BrtBeginBook),
      encodeBrtFileVersion(),
      encodeBrtWbProp(),
      encodeMarker(REC.BrtBeginBookViews),
      encodeBrtBookView(),
      encodeMarker(REC.BrtEndBookViews),
      encodeMarker(REC.BrtBeginBundleShs),
    ];
    for (let i = 0; i < this._sheets.length; i++) {
      // iTabID 는 1-base 고유 탭 id (0 은 Excel 이 무효로 보고 복구한다).
      parts.push(encodeBrtBundleSh(this._sheets[i].relId, this._sheets[i].name, i + 1));
    }
    parts.push(encodeMarker(REC.BrtEndBundleShs), encodeMarker(REC.BrtEndBook));
    return bytesUtil.concat(parts);
  }
}
