import type { Bytes } from "@simplysm/core-common";
import type { IWorksheetModel } from "../models/i-worksheet-model";
import type { ICfRuleSpec } from "../models/shared/excel-cf-spec";
import type { ExcelAddressPoint, ExcelAddressRangePoint, ExcelCellType } from "../types";
import { ExcelUtils } from "../utils/excel-utils";
import { concatBytes, readAllRecords, readUint32LE, readXLWideString, REC } from "./biff12-codec";
import { decodeFormula, encodeFormula } from "./biff-ptg";
import {
  decodeBiffCell,
  encodeBeginCount,
  encodeBrtBeginAFilter,
  encodeBrtBeginCFRule,
  encodeBrtBeginConditionalFormatting,
  encodeBrtBeginWsView,
  encodeBrtCellBool,
  encodeBrtCellIsst,
  encodeBrtCellReal,
  encodeBrtCellSt,
  encodeBrtColInfo,
  encodeBrtDrawing,
  encodeBrtFmlaNum,
  encodeBrtMergeCell,
  encodeBrtPane,
  encodeBrtRowHdr,
  encodeBrtSel,
  encodeBrtSheetFormatPr,
  encodeBrtWsDim,
  encodeBrtWsProp,
  encodeMarker,
} from "./biff-records";

const HEX = (n: number): string => n.toString(16).padStart(2, "0").toUpperCase();

/** CFOper(iParam) → cellIs operator. ([MS-XLSB] 2.5.15) */
const CF_OPER_REV: Record<number, ICfRuleSpec["operator"]> = {
  1: "between",
  2: "notBetween",
  3: "equal",
  4: "notEqual",
  5: "greaterThan",
  6: "lessThan",
  7: "greaterThanOrEqual",
  8: "lessThanOrEqual",
};

/** CFTextOper(iParam) → text rule type/operator. ([MS-XLSB] 2.5.17) */
const CF_TEXTOPER_REV: Record<
  number,
  { type: ICfRuleSpec["type"]; operator: ICfRuleSpec["operator"] }
> = {
  0: { type: "containsText", operator: "containsText" },
  1: { type: "notContainsText", operator: "notContains" },
  2: { type: "beginsWith", operator: "beginsWith" },
  3: { type: "endsWith", operator: "endsWith" },
};


/** worksheets/sheetN.bin (BIFF12) 읽기 모델. 셀 값/타입/범위 조회. */
export class BiffWorksheetModel implements IWorksheetModel {
  private readonly _cellMap = new Map<
    string,
    { type: ExcelCellType | undefined; val: string; styleId: number }
  >();
  private readonly _merges: ExcelAddressRangePoint[] = [];
  private readonly _cfs: { sqref: string; rules: { dxfId: string; cfRule: ICfRuleSpec }[] }[] = [];
  private readonly _formulas = new Map<string, string>(); // "r,c" → A1 수식
  private readonly _colWidths = new Map<number, number>(); // col(0-base) → coldx(1/256 char)
  private _autoFilter: ExcelAddressRangePoint | undefined;
  private _zoom: number | undefined;
  private _freeze: { r?: number; c?: number } | undefined;
  private _tabColor: string | undefined;
  private _drawingRelId: string | undefined;
  private _maxRow = 0;
  private _maxCol = 0;

  constructor(bytes?: Bytes) {
    if (bytes != null) this._decode(bytes);
  }

  private _decode(buf: Uint8Array): void {
    let curRow = -1;
    let prevCol = -1;
    let inData = false;
    let curCf: { sqref: string; rules: { dxfId: string; cfRule: ICfRuleSpec }[] } | undefined;

    for (const rec of readAllRecords(buf)) {
      if (rec.type === REC.BrtMergeCell) {
        const p = rec.payload;
        this._merges.push({
          s: { r: readUint32LE(p, 0), c: readUint32LE(p, 8) },
          e: { r: readUint32LE(p, 4), c: readUint32LE(p, 12) },
        });
        continue;
      }
      if (rec.type === REC.BrtColInfo) {
        const p = rec.payload;
        const cf = readUint32LE(p, 0);
        const cl = readUint32LE(p, 4);
        const coldx = readUint32LE(p, 8);
        for (let c = cf; c <= cl; c++) this._colWidths.set(c, coldx);
        continue;
      }
      if (rec.type === REC.BrtBeginAFilter) {
        const p = rec.payload;
        this._autoFilter = {
          s: { r: readUint32LE(p, 0), c: readUint32LE(p, 8) },
          e: { r: readUint32LE(p, 4), c: readUint32LE(p, 12) },
        };
        continue;
      }
      if (rec.type === REC.BrtBeginWsView) {
        const z = rec.payload[18] | (rec.payload[19] << 8);
        if (z !== 0 && z !== 100) this._zoom = z;
        continue;
      }
      if (rec.type === REC.BrtPane) {
        const dv = new DataView(rec.payload.buffer, rec.payload.byteOffset, rec.payload.length);
        const xSplit = dv.getFloat64(0, true);
        const ySplit = dv.getFloat64(8, true);
        if (xSplit > 0 || ySplit > 0) {
          this._freeze = {};
          if (ySplit > 0) this._freeze.r = Math.round(ySplit) - 1;
          if (xSplit > 0) this._freeze.c = Math.round(xSplit) - 1;
        }
        continue;
      }
      if (rec.type === REC.BrtWsProp) {
        const p = rec.payload;
        // WsProp: flags(3B) + brtcolorTab(BrtColor 8B@3). byteA@3==0(auto) 이면 탭색 없음.
        // RGB/theme 모두 resolved RGBA(@7-10) 보존. tabColor 문자열 = "AARRGGBB".
        if (p.length >= 11 && p[3] !== 0x00) {
          this._tabColor = `${HEX(p[10])}${HEX(p[7])}${HEX(p[8])}${HEX(p[9])}`;
        }
        continue;
      }
      if (rec.type === REC.BrtDrawing) {
        this._drawingRelId = readXLWideString(rec.payload, 0).value;
        continue;
      }
      if (rec.type === REC.BrtBeginConditionalFormatting) {
        // [MS-XLSB] 2.4.34: ccf(u32) + flags(u32) + SqRfX(crfx u32 + crfx×RfX).
        const p = rec.payload;
        const crfx = readUint32LE(p, 8);
        const ranges: string[] = [];
        let off = 12;
        for (let k = 0; k < crfx && off + 16 <= p.length; k++) {
          ranges.push(
            ExcelUtils.stringifyRangeAddr({
              s: { r: readUint32LE(p, off), c: readUint32LE(p, off + 8) },
              e: { r: readUint32LE(p, off + 4), c: readUint32LE(p, off + 12) },
            }),
          );
          off += 16;
        }
        curCf = { sqref: ranges.join(" "), rules: [] };
        this._cfs.push(curCf);
        continue;
      }
      if (rec.type === REC.BrtEndConditionalFormatting) {
        curCf = undefined;
        continue;
      }
      if (rec.type === REC.BrtBeginCFRule && curCf != null) {
        const decoded = this._decodeCfRule(rec.payload);
        if (decoded != null) curCf.rules.push(decoded);
        continue;
      }
      if (rec.type === REC.BrtBeginSheetData) {
        inData = true;
        continue;
      }
      if (rec.type === REC.BrtEndSheetData) {
        inData = false;
        continue;
      }
      if (!inData) continue;

      if (rec.type === REC.BrtRowHdr) {
        curRow = readUint32LE(rec.payload, 0);
        prevCol = -1;
        if (curRow > this._maxRow) this._maxRow = curRow;
        continue;
      }
      if (curRow < 0) continue;

      if (rec.type === REC.BrtFmlaNum) {
        const p = rec.payload;
        const col = readUint32LE(p, 0);
        const cce = readUint32LE(p, 18);
        this._formulas.set(`${curRow},${col}`, decodeFormula(p.subarray(22, 22 + cce)));
        prevCol = col;
        if (col > this._maxCol) this._maxCol = col;
        continue;
      }

      const cell = decodeBiffCell(rec, prevCol);
      if (cell == null) continue;
      prevCol = cell.col;
      if (cell.col > this._maxCol) this._maxCol = cell.col;

      if (cell.val != null) {
        this._cellMap.set(`${curRow},${cell.col}`, {
          type: cell.cellType,
          val: cell.val,
          styleId: cell.styleId,
        });
      }
    }
  }

  /**
   * BrtBeginCFRule([MS-XLSB] 2.4.23) payload → CF 규칙 spec.
   * cellIs/expression/text 만 복원. 미지원 rgce(함수 등)는 decodeFormula 실패 시 formula 를 비움
   * (외부 파일 best-effort 읽기 — 셀 데이터 보존 우선).
   */
  private _decodeCfRule(
    p: Uint8Array,
  ): { dxfId: string; cfRule: ICfRuleSpec } | undefined {
    if (p.length < 42) return undefined;
    const iType = readUint32LE(p, 0);
    const iTemplate = readUint32LE(p, 4);
    const dxfId = readUint32LE(p, 8);
    const iParam = readUint32LE(p, 16);
    const cb1 = readUint32LE(p, 30);
    const cb2 = readUint32LE(p, 34);

    // strParam(XLNullableWideString) @42
    let off = 42;
    let text: string | undefined;
    if (readUint32LE(p, off) === 0xffffffff) {
      off += 4;
    } else {
      const s = readXLWideString(p, off);
      text = s.value;
      off += s.bytesRead;
    }

    // rgce1/rgce2 (CFParsedFormula: cce u32 + rgce + cb u32)
    const formula: string[] = [];
    const readFmla = (cb: number): void => {
      if (cb === 0 || off + 4 > p.length) return;
      const cce = readUint32LE(p, off);
      const rgce = p.subarray(off + 4, off + 4 + cce);
      off += 4 + cce;
      const rgcb = off + 4 <= p.length ? readUint32LE(p, off) : 0;
      off += 4 + rgcb;
      try {
        formula.push(decodeFormula(rgce));
      } catch {
        // 함수 등 미지원 Ptg — formula 생략
      }
    };
    readFmla(cb1);
    readFmla(cb2);

    let type: ICfRuleSpec["type"];
    let operator: ICfRuleSpec["operator"] | undefined;
    if (iType === 1) {
      type = "cellIs";
      operator = CF_OPER_REV[iParam];
    } else if (iType === 2 && iTemplate === 8) {
      const t = CF_TEXTOPER_REV[iParam];
      type = t.type;
      operator = t.operator;
    } else {
      type = "expression";
    }

    const cfRule: ICfRuleSpec = { type, formula };
    if (operator != null) cfRule.operator = operator;
    if (text != null) cfRule.text = text;
    return { dxfId: dxfId.toString(), cfRule };
  }

  get range(): ExcelAddressRangePoint {
    return { s: { r: 0, c: 0 }, e: { r: this._maxRow, c: this._maxCol } };
  }

  getCellVal(addr: ExcelAddressPoint): string | undefined {
    return this._cellMap.get(`${addr.r},${addr.c}`)?.val;
  }

  getCellType(addr: ExcelAddressPoint): ExcelCellType | undefined {
    return this._cellMap.get(`${addr.r},${addr.c}`)?.type;
  }

  getCellStyleId(addr: ExcelAddressPoint): string | undefined {
    const c = this._cellMap.get(`${addr.r},${addr.c}`);
    return c != null && c.styleId !== 0 ? c.styleId.toString() : undefined;
  }

  getCellFormula(addr: ExcelAddressPoint): string | undefined {
    return this._formulas.get(`${addr.r},${addr.c}`);
  }

  getMergeCells(): ExcelAddressRangePoint[] {
    return this._merges;
  }

  // --- 이하 write/mutation: Stage 3 이후 ---
  setCellType(addr: ExcelAddressPoint, type: ExcelCellType | undefined): void {
    const key = `${addr.r},${addr.c}`;
    const cur = this._cellMap.get(key) ?? { type: undefined, val: "", styleId: 0 };
    cur.type = type;
    this._cellMap.set(key, cur);
    this._grow(addr);
  }
  setCellVal(addr: ExcelAddressPoint, val: string | undefined): void {
    const key = `${addr.r},${addr.c}`;
    if (val == null) {
      this._cellMap.delete(key);
      return;
    }
    const cur = this._cellMap.get(key) ?? { type: undefined, val: "", styleId: 0 };
    cur.val = val;
    this._cellMap.set(key, cur);
    this._grow(addr);
  }
  deleteCell(addr: ExcelAddressPoint): void {
    this._cellMap.delete(`${addr.r},${addr.c}`);
  }
  setCellStyleId(addr: ExcelAddressPoint, styleId: string | undefined): void {
    const key = `${addr.r},${addr.c}`;
    const cur = this._cellMap.get(key) ?? { type: undefined, val: "", styleId: 0 };
    cur.styleId = styleId != null ? parseInt(styleId, 10) : 0;
    this._cellMap.set(key, cur);
    this._grow(addr);
  }
  setCellFormula(addr: ExcelAddressPoint, val: string | undefined): void {
    const key = `${addr.r},${addr.c}`;
    if (val == null) {
      this._formulas.delete(key);
      return;
    }
    this._formulas.set(key, val);
    this._grow(addr);
  }

  private _grow(addr: ExcelAddressPoint): void {
    if (addr.r > this._maxRow) this._maxRow = addr.r;
    if (addr.c > this._maxCol) this._maxCol = addr.c;
  }
  setMergeCells(startAddr: ExcelAddressPoint, endAddr: ExcelAddressPoint): void {
    this._merges.push({ s: { ...startAddr }, e: { ...endAddr } });
  }
  shiftMergeCells(fromRow: number, delta: number): void {
    for (const m of this._merges) {
      if (m.s.r >= fromRow) m.s.r += delta;
      if (m.e.r >= fromRow) m.e.r += delta;
    }
  }
  copyRow(sourceR: number, targetR: number, options?: { skipMerge?: boolean }): void {
    const cellEntries = [...this._cellMap.entries()];
    const fmlEntries = [...this._formulas.entries()];
    const rowOf = (k: string): number => Number(k.slice(0, k.indexOf(",")));
    const colOf = (k: string): number => Number(k.slice(k.indexOf(",") + 1));

    for (const [k] of cellEntries) if (rowOf(k) === targetR) this._cellMap.delete(k);
    for (const [k] of fmlEntries) if (rowOf(k) === targetR) this._formulas.delete(k);

    for (const [k, cell] of cellEntries) {
      if (rowOf(k) === sourceR) {
        const c = colOf(k);
        this._cellMap.set(`${targetR},${c}`, { ...cell });
        this._grow({ r: targetR, c });
      }
    }
    for (const [k, f] of fmlEntries) {
      if (rowOf(k) === sourceR) this._formulas.set(`${targetR},${colOf(k)}`, f);
    }

    if (options?.skipMerge === true) return;

    const rowDiff = targetR - sourceR;
    const srcMerges = this._merges
      .filter((m) => m.s.r <= sourceR && m.e.r >= sourceR)
      .map((m) => ({ s: { ...m.s }, e: { ...m.e } }));
    for (let i = this._merges.length - 1; i >= 0; i--) {
      const m = this._merges[i];
      if (m.s.r <= targetR && m.e.r >= targetR) this._merges.splice(i, 1);
    }
    for (const m of srcMerges) {
      this._merges.push({
        s: { r: m.s.r + rowDiff, c: m.s.c },
        e: { r: m.e.r + rowDiff, c: m.e.c },
      });
    }
  }

  copyCell(sourceAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): void {
    const tk = `${targetAddr.r},${targetAddr.c}`;
    const sk = `${sourceAddr.r},${sourceAddr.c}`;
    this._cellMap.delete(tk);
    this._formulas.delete(tk);
    const cell = this._cellMap.get(sk);
    if (cell != null) {
      this._cellMap.set(tk, { ...cell });
      this._grow(targetAddr);
    }
    const f = this._formulas.get(sk);
    if (f != null) this._formulas.set(tk, f);
  }
  addConditionalFormatting(
    sqref: string,
    rules: { dxfId: string; cfRule: ICfRuleSpec }[],
  ): void {
    this._cfs.push({
      sqref,
      rules: rules.map((r) => ({ dxfId: r.dxfId, cfRule: r.cfRule })),
    });
  }

  /** @internal 테스트용 — 디코드된 조건부 서식. */
  get conditionalFormats(): { sqref: string; rules: { dxfId: string; cfRule: ICfRuleSpec }[] }[] {
    return this._cfs;
  }
  setTabColor(rgb: string): void {
    this._tabColor = rgb;
  }
  setZoom(percent: number): void {
    this._zoom = percent;
  }
  freezeAt(point: { r?: number; c?: number }): void {
    this._freeze = { ...point };
  }
  setAutoFilter(range: ExcelAddressRangePoint): void {
    this._autoFilter = { s: { ...range.s }, e: { ...range.e } };
  }
  setColWidth(colIndex: string, width: string): void {
    const col = parseInt(colIndex, 10) - 1; // colIndex 는 1-base
    const coldx = Math.round(parseFloat(width) * 256);
    if (!Number.isNaN(col) && !Number.isNaN(coldx)) this._colWidths.set(col, coldx);
  }
  setDrawingRelId(relId: string): void {
    this._drawingRelId = relId;
  }
  serialize(): Bytes {
    const parts: Uint8Array[] = [encodeMarker(REC.BrtBeginSheet)];

    // WsProp 는 Excel 필수 — 항상 생성(tabColor 없으면 auto).
    parts.push(encodeBrtWsProp(this._tabColor));

    parts.push(encodeBrtWsDim(0, this._maxRow, 0, this._maxCol));

    // sheetViews 는 Excel 필수 — 항상 생성한다.
    parts.push(encodeMarker(REC.BrtBeginWsViews));
    parts.push(encodeBrtBeginWsView(this._zoom ?? 100));
    if (this._freeze != null) {
      const r = this._freeze.r;
      const c = this._freeze.c;
      const ySplit = r != null ? r + 1 : 0;
      const xSplit = c != null ? c + 1 : 0;
      const pnnAcc = r != null && c != null ? 0 : r != null ? 2 : 1;
      parts.push(encodeBrtPane(xSplit, ySplit, ySplit, xSplit, pnnAcc));
    }
    parts.push(encodeBrtSel());
    parts.push(encodeMarker(REC.BrtEndWsView));
    parts.push(encodeMarker(REC.BrtEndWsViews));

    // SheetFormatPr 는 Excel 필수(기본 행높이 등).
    parts.push(encodeBrtSheetFormatPr());

    if (this._colWidths.size > 0) {
      parts.push(encodeMarker(REC.BrtBeginColInfos));
      for (const [col, coldx] of this._colWidths) {
        parts.push(encodeBrtColInfo(col, col, coldx));
      }
      parts.push(encodeMarker(REC.BrtEndColInfos));
    }

    parts.push(encodeMarker(REC.BrtBeginSheetData));

    // 행 → 열 집합 (값 셀 + 수식 셀 합집합)
    const rowCols = new Map<number, Set<number>>();
    const addKey = (key: string): void => {
      const comma = key.indexOf(",");
      const r = Number(key.slice(0, comma));
      const c = Number(key.slice(comma + 1));
      (rowCols.get(r) ?? rowCols.set(r, new Set()).get(r)!).add(c);
    };
    for (const key of this._cellMap.keys()) addKey(key);
    for (const key of this._formulas.keys()) addKey(key);

    for (const r of [...rowCols.keys()].sort((a, b) => a - b)) {
      const cols = [...rowCols.get(r)!].sort((a, b) => a - b);
      parts.push(encodeBrtRowHdr(r, cols[0], cols[cols.length - 1]));
      for (const c of cols) {
        const fml = this._formulas.get(`${r},${c}`);
        if (fml != null) {
          const cell = this._cellMap.get(`${r},${c}`);
          parts.push(encodeBrtFmlaNum(c, cell?.styleId ?? 0, encodeFormula(fml)));
        } else {
          parts.push(this._encodeCell(c, this._cellMap.get(`${r},${c}`)!));
        }
      }
    }

    parts.push(encodeMarker(REC.BrtEndSheetData));

    if (this._merges.length > 0) {
      parts.push(encodeBeginCount(REC.BrtBeginMergeCells, this._merges.length));
      for (const m of this._merges) parts.push(encodeBrtMergeCell(m.s, m.e));
      parts.push(encodeMarker(REC.BrtEndMergeCells));
    }

    if (this._autoFilter != null) {
      parts.push(encodeBrtBeginAFilter(this._autoFilter.s, this._autoFilter.e));
      parts.push(encodeMarker(REC.BrtEndAFilter));
    }

    // CF 규칙 priority 는 시트 전역 1-base 카운터(고유·>0 필수, [MS-XLSB] 2.4.23 iPri).
    let cfPriority = 1;
    for (const cf of this._cfs) {
      parts.push(encodeBrtBeginConditionalFormatting(cf.sqref, cf.rules.length));
      for (const rule of cf.rules) {
        parts.push(encodeBrtBeginCFRule(parseInt(rule.dxfId, 10), cfPriority++, rule.cfRule));
        parts.push(encodeMarker(REC.BrtEndCFRule));
      }
      parts.push(encodeMarker(REC.BrtEndConditionalFormatting));
    }

    if (this._drawingRelId != null) {
      parts.push(encodeBrtDrawing(this._drawingRelId));
    }

    parts.push(encodeMarker(REC.BrtEndSheet));
    return concatBytes(parts);
  }

  private _encodeCell(
    col: number,
    cell: { type: ExcelCellType | undefined; val: string; styleId: number },
  ): Uint8Array {
    if (cell.type === "b") {
      return encodeBrtCellBool(col, cell.styleId, cell.val === "1");
    }
    if (cell.type === "s") {
      return encodeBrtCellIsst(col, cell.styleId, parseInt(cell.val, 10));
    }
    if (cell.type === "str" || cell.type === "inlineStr") {
      return encodeBrtCellSt(col, cell.styleId, cell.val);
    }
    return encodeBrtCellReal(col, cell.styleId, parseFloat(cell.val));
  }
}
