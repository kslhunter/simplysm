import type { Bytes } from "@simplysm/core-common";
import type { IStyleModel } from "../models/i-style-model";
import type { ExcelStyle } from "../models/shared/excel-style";
import type { ExcelConditionalRuleStyle } from "../types";
import { concatBytes, encodeRecord, readAllRecords, readXLWideString, REC } from "./biff12-codec";
import { encodeBeginCount, encodeBrtDXF, encodeBrtFmt, encodeCellXF, encodeMarker } from "./biff-records";

const HEX = (n: number): string => n.toString(16).padStart(2, "0").toUpperCase();

const READONLY_WRITE = "기존 xlsb 의 스타일 수정은 아직 지원되지 않습니다 (후속 예정).";
const STYLE_WRITE_LIMIT =
  "xlsb 는 numberFormat 외 셀 스타일(배경/테두리/폰트/정렬) 쓰기를 아직 지원하지 않습니다 (후속 예정).";

const hexBytes = (h: string): Uint8Array =>
  Uint8Array.from(h.split(" ").map((x) => parseInt(x, 16)));

// boa-sample.xlsb 정답지에서 추출한 기본 슬롯 (Calibri 11 / none·gray125 fill / empty border / General xf).
const SLOT_FONT = hexBytes(
  "dc 00 00 00 90 01 00 00 00 02 00 00 07 01 00 00 00 00 00 ff 02 07 00 00 00 43 00 61 00 6c 00 69 00 62 00 72 00 69 00",
);
const SLOT_FILL_NONE = hexBytes(
  "00 00 00 00 03 40 00 00 00 00 00 ff 03 41 00 00 ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00",
);
const SLOT_FILL_GRAY125 = hexBytes(
  "11 00 00 00 03 40 00 00 00 00 00 ff 03 41 00 00 ff ff ff ff 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00",
);
const SLOT_BORDER = hexBytes(
  "00 00 00 01 00 00 00 00 00 00 00 00 00 01 00 00 00 00 00 00 00 00 00 01 00 00 00 00 00 00 00 00 00 01 00 00 00 00 00 00 00 00 00 01 00 00 00 00 00 00 00",
);
const SLOT_CELLSTYLEXF = hexBytes("ff ff 00 00 00 00 00 00 00 00 00 00 10 10 00 00");

/**
 * styles.bin (BIFF12) 읽기/쓰기 모델.
 *
 * **읽기**: 셀 iStyleRef(cellXFs 인덱스) → numFmtId 매핑 + numFmt 코드 디코드(날짜/숫자 포맷 판정용).
 * 원본을 읽은 경우 직렬화는 원본 바이트를 그대로 보존한다(스타일 손실 방지).
 *
 * **쓰기**(새 워크북, 빈 모델): numberFormat 만 지원. 기본 슬롯(font/fill/border/cellStyleXF)을
 * 정답지 byte 로 고정하고, cellXFs 만 numFmtId 별로 추가하여 styles.bin 을 재생성한다.
 * 배경·테두리·폰트·정렬은 후속 단계.
 */
export class BiffStyleModel implements IStyleModel {
  private readonly _raw: Bytes | undefined;
  private readonly _numFmts = new Map<number, string>();
  private readonly _cellXfNumFmtIds: number[];
  private readonly _dxfs: ExcelConditionalRuleStyle[] = [];

  constructor(bytes?: Bytes) {
    this._raw = bytes;
    if (bytes != null) {
      this._cellXfNumFmtIds = [];
      this._decode(bytes);
    } else {
      this._cellXfNumFmtIds = [0]; // cellXF[0] = General
    }
  }

  private _decode(buf: Uint8Array): void {
    let inCellXfs = false;
    for (const rec of readAllRecords(buf)) {
      if (rec.type === REC.BrtFmt) {
        const id = rec.payload[0] | (rec.payload[1] << 8);
        this._numFmts.set(id, readXLWideString(rec.payload, 2).value);
      } else if (rec.type === REC.BrtBeginCellXFs) {
        inCellXfs = true;
      } else if (rec.type === REC.BrtEndCellXFs) {
        inCellXfs = false;
      } else if (inCellXfs && rec.type === REC.BrtXF) {
        // BrtXF(16B): ixfeParent(u16@0) + iFmt(u16@2) + iFont(@4) + iFill(@6) + ixBorder(@8) + ...
        this._cellXfNumFmtIds.push(rec.payload[2] | (rec.payload[3] << 8));
      } else if (rec.type === REC.BrtDXF) {
        this._dxfs.push(this._decodeDxf(rec.payload));
      }
    }
  }

  /**
   * BrtDXF([MS-XLSB] 2.4.359) payload → 조건부 서식 스타일.
   * header(2) + XFProps(reserved 2 + cprops 2 + XFProp[]). bg color(0x02)→background,
   * text color(0x05)→fontColor, Bold(0x19, >=700)→bold. 그 외 prop(border/numFmt 등)은 무시.
   */
  private _decodeDxf(p: Uint8Array): ExcelConditionalRuleStyle {
    const dxf: ExcelConditionalRuleStyle = {};
    if (p.length < 6) return dxf;
    const cprops = p[4] | (p[5] << 8);
    // XFPropColor(8B) → "AARRGGBB" (LongRGBA = R,G,B,A @blob[4..7])
    const argb = (blob: Uint8Array): string =>
      `${HEX(blob[7])}${HEX(blob[4])}${HEX(blob[5])}${HEX(blob[6])}`;
    let off = 6;
    for (let k = 0; k < cprops && off + 4 <= p.length; k++) {
      const type = p[off] | (p[off + 1] << 8);
      const cb = p[off + 2] | (p[off + 3] << 8);
      if (cb < 4) break;
      const blob = p.subarray(off + 4, off + cb);
      if (type === 0x02 && blob.length >= 8) dxf.background = argb(blob);
      else if (type === 0x05 && blob.length >= 8) dxf.fontColor = argb(blob);
      else if (type === 0x19 && blob.length >= 2 && (blob[0] | (blob[1] << 8)) >= 700) {
        dxf.fontWeight = "bold";
      }
      off += cb;
    }
    return dxf;
  }

  get(id: string): ExcelStyle {
    const idx = parseInt(id, 10);
    if (idx < 0 || idx >= this._cellXfNumFmtIds.length) return {};
    return { numFmtId: this._cellXfNumFmtIds[idx].toString() };
  }

  getNumFmtCode(numFmtId: string): string | undefined {
    return this._numFmts.get(parseInt(numFmtId, 10));
  }

  add(style: ExcelStyle): string {
    if (this._raw != null) throw new Error(READONLY_WRITE);
    if (
      style.background != null ||
      style.border != null ||
      style.font != null ||
      style.horizontalAlign != null ||
      style.verticalAlign != null
    ) {
      throw new Error(STYLE_WRITE_LIMIT);
    }

    let numFmtId = 0;
    if (style.numFmtCode != null) numFmtId = this._setNumFmtCode(style.numFmtCode);
    else if (style.numFmtId != null) numFmtId = parseInt(style.numFmtId, 10);

    const existing = this._cellXfNumFmtIds.indexOf(numFmtId);
    if (existing >= 0) return existing.toString();
    this._cellXfNumFmtIds.push(numFmtId);
    return (this._cellXfNumFmtIds.length - 1).toString();
  }

  addWithClone(_id: string, style: ExcelStyle): string {
    // 현재 numberFormat 만 지원하므로 clone 은 numFmt 교체와 동일하다.
    return this.add(style);
  }

  addDxf(style: ExcelConditionalRuleStyle): string {
    if (this._raw != null) throw new Error(READONLY_WRITE);
    const key = JSON.stringify(style);
    const idx = this._dxfs.findIndex((d) => JSON.stringify(d) === key);
    if (idx >= 0) return idx.toString();
    this._dxfs.push(style);
    return (this._dxfs.length - 1).toString();
  }

  /** @internal 테스트용 — 디코드된 dxf 목록. */
  get dxfs(): ExcelConditionalRuleStyle[] {
    return this._dxfs;
  }

  setDefaultStyle(): void {
    throw new Error(STYLE_WRITE_LIMIT);
  }

  private _setNumFmtCode(code: string): number {
    for (const [id, c] of this._numFmts) {
      if (c === code) return id;
    }
    // 사용자 정의 numFmt 는 180+ 부터.
    let next = 180;
    while (this._numFmts.has(next)) next++;
    this._numFmts.set(next, code);
    return next;
  }

  serialize(): Bytes {
    if (this._raw != null) return this._raw;

    const parts: Uint8Array[] = [encodeMarker(REC.BrtBeginStyleSheet)];

    if (this._numFmts.size > 0) {
      parts.push(encodeBeginCount(REC.BrtBeginFmts, this._numFmts.size));
      for (const [id, code] of this._numFmts) parts.push(encodeBrtFmt(id, code));
      parts.push(encodeMarker(REC.BrtEndFmts));
    }

    parts.push(
      encodeBeginCount(REC.BrtBeginFonts, 1),
      encodeRecord(REC.BrtFont, SLOT_FONT),
      encodeMarker(REC.BrtEndFonts),
    );
    parts.push(
      encodeBeginCount(REC.BrtBeginFills, 2),
      encodeRecord(REC.BrtFill, SLOT_FILL_NONE),
      encodeRecord(REC.BrtFill, SLOT_FILL_GRAY125),
      encodeMarker(REC.BrtEndFills),
    );
    parts.push(
      encodeBeginCount(REC.BrtBeginBorders, 1),
      encodeRecord(REC.BrtBorder, SLOT_BORDER),
      encodeMarker(REC.BrtEndBorders),
    );
    parts.push(
      encodeBeginCount(REC.BrtBeginCellStyleXFs, 1),
      encodeRecord(REC.BrtXF, SLOT_CELLSTYLEXF),
      encodeMarker(REC.BrtEndCellStyleXFs),
    );

    parts.push(encodeBeginCount(REC.BrtBeginCellXFs, this._cellXfNumFmtIds.length));
    for (const numFmtId of this._cellXfNumFmtIds) parts.push(encodeCellXF(numFmtId));
    parts.push(encodeMarker(REC.BrtEndCellXFs));

    if (this._dxfs.length > 0) {
      parts.push(encodeBeginCount(REC.BrtBeginDXFs, this._dxfs.length));
      for (const d of this._dxfs) {
        parts.push(encodeBrtDXF(d.background, d.fontColor, d.fontWeight === "bold"));
      }
      parts.push(encodeMarker(REC.BrtEndDXFs));
    }

    parts.push(encodeMarker(REC.BrtEndStyleSheet));
    return concatBytes(parts);
  }
}
