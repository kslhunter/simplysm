import type { ICfRuleSpec } from "../models/shared/excel-cf-spec";
import type { ExcelCellType } from "../types";
import { ExcelUtils } from "../utils/excel-utils";
import type { IRecord } from "./biff12-codec";
import {
  concatBytes,
  decodeRkNumber,
  encodeRecord,
  encodeXLWideString,
  readAllRecords,
  readCellPrefix,
  readUint32LE,
  readXLWideString,
  REC,
  writeCellPrefix,
  writeUint32LE,
} from "./biff12-codec";
import { encodeFormula } from "./biff-ptg";

/**
 * BIFF12 레코드 단위 reader.
 * adtek `biff12.ts` 의 reader 로직을 포팅. 프리미티브는 `biff12-codec.ts`.
 */

/** `"rId1"` → `1`. 형식 불일치 시 undefined. */
export function parseRelId(relId: string): number | undefined {
  const m = /^rId(\d+)$/.exec(relId);
  return m ? parseInt(m[1], 10) : undefined;
}

/**
 * workbook.bin → 시트 항목 (BrtBundleSh) 순서대로.
 *
 * BrtBundleSh payload ([MS-XLSB] 2.4.301): hsState(4) + iTabID(4) + XLWideString strRelID + XLWideString strName.
 */
export function readWorkbookSheets(buf: Uint8Array): { name: string; relId: string }[] {
  const out: { name: string; relId: string }[] = [];
  for (const rec of readAllRecords(buf)) {
    if (rec.type !== REC.BrtBundleSh) continue;
    const rel = readXLWideString(rec.payload, 8);
    const name = readXLWideString(rec.payload, 8 + rel.bytesRead);
    out.push({ name: name.value, relId: rel.value });
  }
  return out;
}

/** sharedStrings.bin → 문자열 배열 (BrtSSTItem 만 순서대로). payload: flags(1) + XLWideString. */
export function readSharedStrings(buf: Uint8Array): string[] {
  const out: string[] = [];
  for (const rec of readAllRecords(buf)) {
    if (rec.type !== REC.BrtSSTItem) continue;
    const { value } = readXLWideString(rec.payload, 1);
    out.push(value);
  }
  return out;
}

/** 디코드된 셀 1개. `val === undefined` 는 blank(스타일만). `cellType` 은 OOXML 시맨틱. */
export interface IDecodedBiffCell {
  col: number;
  /** cell 의 iStyleRef (cellXFs 인덱스). Short cell 은 0. */
  styleId: number;
  cellType: ExcelCellType | undefined;
  val: string | undefined;
}

function readFloat64(payload: Uint8Array, off: number): number {
  const view = new DataView(payload.buffer, payload.byteOffset + off, 8);
  return view.getFloat64(0, true);
}

/**
 * Cell record 1개를 OOXML 시맨틱으로 디코드.
 *
 * - Full cell (Brt*) : payload 첫 4 byte = col, 8 byte prefix 후 값.
 * - Short cell (BrtShort*) : col 정보 없음 (이전 셀 + 1), 4 byte prefix 후 값.
 *
 * SST 인덱스 셀(Isst)은 `cellType="s"`, `val=인덱스문자열` 로 반환 — SST 조회는 상위(ExcelCell)가 수행.
 * inline string(St)은 `cellType="str"`. 숫자(Real/Rk)는 `cellType=undefined`(number).
 *
 * 대상 외 record 는 undefined.
 */
export function decodeBiffCell(rec: IRecord, prevCol: number): IDecodedBiffCell | undefined {
  const p = rec.payload;
  const fullStyle = (): number => readCellPrefix(p).iStyleRef;
  switch (rec.type) {
    case REC.BrtCellIsst:
      return {
        col: readUint32LE(p, 0),
        styleId: fullStyle(),
        cellType: "s",
        val: readUint32LE(p, 8).toString(),
      };
    case REC.BrtShortIsst:
      return { col: prevCol + 1, styleId: 0, cellType: "s", val: readUint32LE(p, 4).toString() };
    case REC.BrtCellSt:
      return {
        col: readUint32LE(p, 0),
        styleId: fullStyle(),
        cellType: "str",
        val: readXLWideString(p, 8).value,
      };
    case REC.BrtShortSt:
      return { col: prevCol + 1, styleId: 0, cellType: "str", val: readXLWideString(p, 4).value };
    case REC.BrtCellReal:
      return {
        col: readUint32LE(p, 0),
        styleId: fullStyle(),
        cellType: undefined,
        val: readFloat64(p, 8).toString(),
      };
    case REC.BrtShortReal:
      return { col: prevCol + 1, styleId: 0, cellType: undefined, val: readFloat64(p, 4).toString() };
    case REC.BrtCellRk:
      return {
        col: readUint32LE(p, 0),
        styleId: fullStyle(),
        cellType: undefined,
        val: decodeRkNumber(readUint32LE(p, 8)).toString(),
      };
    case REC.BrtShortRk:
      return {
        col: prevCol + 1,
        styleId: 0,
        cellType: undefined,
        val: decodeRkNumber(readUint32LE(p, 4)).toString(),
      };
    case REC.BrtCellBool:
      return { col: readUint32LE(p, 0), styleId: fullStyle(), cellType: "b", val: p[8] ? "1" : "0" };
    case REC.BrtCellBlank:
      return { col: readUint32LE(p, 0), styleId: fullStyle(), cellType: undefined, val: undefined };
    case REC.BrtShortBlank:
      return { col: prevCol + 1, styleId: 0, cellType: undefined, val: undefined };
    default:
      return undefined;
  }
}

//#region Encoders (Stage 3 writer)

/** payload 없는 begin/end 마커 record. */
export function encodeMarker(type: number): Uint8Array {
  return encodeRecord(type, new Uint8Array(0));
}

/**
 * BrtBundleSh — 워크북의 시트 항목.
 * payload: hsState(4) + iTabID(4) + XLWideString strRelID + XLWideString strName.
 */
export function encodeBrtBundleSh(relId: string, name: string, tabId: number): Uint8Array {
  const rel = encodeXLWideString(relId);
  const nm = encodeXLWideString(name);
  const payload = new Uint8Array(8 + rel.length + nm.length);
  writeUint32LE(payload, 0, 0); // hsState = visible
  writeUint32LE(payload, 4, tabId);
  payload.set(rel, 8);
  payload.set(nm, 8 + rel.length);
  return encodeRecord(REC.BrtBundleSh, payload);
}

/** BrtBeginSst — count(4) + uniqueCount(4). */
export function encodeBrtBeginSst(count: number, uniqueCount: number): Uint8Array {
  const payload = new Uint8Array(8);
  writeUint32LE(payload, 0, count);
  writeUint32LE(payload, 4, uniqueCount);
  return encodeRecord(REC.BrtBeginSst, payload);
}

/** BrtSSTItem — flags(1) + XLWideString. */
export function encodeBrtSSTItem(value: string): Uint8Array {
  const wide = encodeXLWideString(value);
  const payload = new Uint8Array(1 + wide.length);
  payload[0] = 0; // flags
  payload.set(wide, 1);
  return encodeRecord(REC.BrtSSTItem, payload);
}

/** BrtCellIsst — cell prefix(8) + sharedString 인덱스(4). */
export function encodeBrtCellIsst(col: number, iStyleRef: number, sstIndex: number): Uint8Array {
  const payload = new Uint8Array(8 + 4);
  writeCellPrefix(payload, 0, col, iStyleRef);
  writeUint32LE(payload, 8, sstIndex);
  return encodeRecord(REC.BrtCellIsst, payload);
}

/** BrtCellReal — cell prefix(8) + IEEE754 double(8). */
export function encodeBrtCellReal(col: number, iStyleRef: number, value: number): Uint8Array {
  const payload = new Uint8Array(8 + 8);
  writeCellPrefix(payload, 0, col, iStyleRef);
  new DataView(payload.buffer, payload.byteOffset + 8, 8).setFloat64(0, value, true);
  return encodeRecord(REC.BrtCellReal, payload);
}

/** BrtCellSt — cell prefix(8) + XLWideString (inline string). */
export function encodeBrtCellSt(col: number, iStyleRef: number, value: string): Uint8Array {
  const wide = encodeXLWideString(value);
  const payload = new Uint8Array(8 + wide.length);
  writeCellPrefix(payload, 0, col, iStyleRef);
  payload.set(wide, 8);
  return encodeRecord(REC.BrtCellSt, payload);
}

/** BrtCellBool — cell prefix(8) + boolean(1). */
export function encodeBrtCellBool(col: number, iStyleRef: number, value: boolean): Uint8Array {
  const payload = new Uint8Array(9);
  writeCellPrefix(payload, 0, col, iStyleRef);
  payload[8] = value ? 1 : 0;
  return encodeRecord(REC.BrtCellBool, payload);
}

/** BrtCellBlank — cell prefix(8) (style 만 가진 빈 셀). */
export function encodeBrtCellBlank(col: number, iStyleRef: number): Uint8Array {
  const payload = new Uint8Array(8);
  writeCellPrefix(payload, 0, col, iStyleRef);
  return encodeRecord(REC.BrtCellBlank, payload);
}

/**
 * BrtRowHdr — [MS-XLSB] 2.4.726.
 * payload(25): rwT(4) + ixfe(4) + miyRw(2) + 패딩/flags(3) + ncolspan(4) + colFirst(4) + colLast(4).
 */
export function encodeBrtRowHdr(rowIndex: number, colFirst: number, colLast: number): Uint8Array {
  const payload = new Uint8Array(25);
  writeUint32LE(payload, 0, rowIndex);
  writeUint32LE(payload, 4, 0); // ixfe
  payload[8] = 0x40; // miyRw 0x0140 = 16pt
  payload[9] = 0x01;
  writeUint32LE(payload, 13, 1); // ncolspan
  writeUint32LE(payload, 17, colFirst);
  writeUint32LE(payload, 21, colLast);
  return encodeRecord(REC.BrtRowHdr, payload);
}

/** begin 컨테이너 레코드 (count u32 payload). */
export function encodeBeginCount(type: number, count: number): Uint8Array {
  const payload = new Uint8Array(4);
  writeUint32LE(payload, 0, count);
  return encodeRecord(type, payload);
}

/** BrtFmt — numFmtId(u16) + XLWideString formatCode. */
export function encodeBrtFmt(numFmtId: number, formatCode: string): Uint8Array {
  const code = encodeXLWideString(formatCode);
  const payload = new Uint8Array(2 + code.length);
  payload[0] = numFmtId & 0xff;
  payload[1] = (numFmtId >>> 8) & 0xff;
  payload.set(code, 2);
  return encodeRecord(REC.BrtFmt, payload);
}

/**
 * cellXF용 BrtXF(16B). ixfeParent=0(cellStyleXFs[0] 참조), iFmt=numFmtId, font/fill/border=0.
 * flags(@12)=0x1010 은 정답지 기본값.
 */
export function encodeCellXF(numFmtId: number): Uint8Array {
  const p = new Uint8Array(16);
  p[2] = numFmtId & 0xff;
  p[3] = (numFmtId >>> 8) & 0xff;
  p[12] = 0x10;
  p[13] = 0x10;
  return encodeRecord(REC.BrtXF, p);
}

/** BrtWsDim — UncheckedRfX(16): rwFirst, rwLast, colFirst, colLast. */
export function encodeBrtWsDim(
  rwFirst: number,
  rwLast: number,
  colFirst: number,
  colLast: number,
): Uint8Array {
  const payload = new Uint8Array(16);
  writeUint32LE(payload, 0, rwFirst);
  writeUint32LE(payload, 4, rwLast);
  writeUint32LE(payload, 8, colFirst);
  writeUint32LE(payload, 12, colLast);
  return encodeRecord(REC.BrtWsDim, payload);
}

/** BrtMergeCell — UncheckedRfX(16): rwFirst, rwLast, colFirst, colLast. */
export function encodeBrtMergeCell(
  s: { r: number; c: number },
  e: { r: number; c: number },
): Uint8Array {
  const payload = new Uint8Array(16);
  writeUint32LE(payload, 0, s.r);
  writeUint32LE(payload, 4, e.r);
  writeUint32LE(payload, 8, s.c);
  writeUint32LE(payload, 12, e.c);
  return encodeRecord(REC.BrtMergeCell, payload);
}

/**
 * BrtColInfo — colFirst(u32) + colLast(u32) + coldx(u32) + ixfe(u32) + flags(u16).
 * coldx 는 1/256 문자 단위 너비. flags bit1(fUserSet)=커스텀 너비.
 */
export function encodeBrtColInfo(colFirst: number, colLast: number, coldx: number): Uint8Array {
  const payload = new Uint8Array(18);
  writeUint32LE(payload, 0, colFirst);
  writeUint32LE(payload, 4, colLast);
  writeUint32LE(payload, 8, coldx);
  writeUint32LE(payload, 12, 0); // ixfe
  payload[16] = 0x02; // fUserSet
  payload[17] = 0x00;
  return encodeRecord(REC.BrtColInfo, payload);
}

/** BrtFileVersion — 빈 새 워크북(통합 문서1.xlsb) 정답지 byte. */
export function encodeBrtFileVersion(): Uint8Array {
  return encodeRecord(
    REC.BrtFileVersion,
    Uint8Array.from([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x02, 0x00, 0x00, 0x00, 0x78, 0x00, 0x6c, 0x00, 0x01, 0x00, 0x00, 0x00, 0x37, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x37, 0x00, 0x05, 0x00, 0x00, 0x00, 0x33, 0x00, 0x30, 0x00, 0x30,
      0x00, 0x32, 0x00, 0x36, 0x00,
    ]),
  );
}

/** BrtWbProp — 통합 문서 속성. 빈 새 워크북 정답지 byte(12B, codeName 없음). */
export function encodeBrtWbProp(): Uint8Array {
  return encodeRecord(
    REC.BrtWbProp,
    Uint8Array.from([0x20, 0x00, 0x01, 0x00, 0x3c, 0x16, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00]),
  );
}

/** BrtBookView — workbook 창 뷰. 빈 새 워크북 정답지 byte. */
export function encodeBrtBookView(): Uint8Array {
  return encodeRecord(
    REC.BrtBookView,
    Uint8Array.from([
      0x65, 0x04, 0x00, 0x00, 0x93, 0x12, 0x00, 0x00, 0xfc, 0x6c, 0x00, 0x00, 0x95, 0x5b, 0x00,
      0x00, 0x58, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x78,
    ]),
  );
}

/** BrtSheetFormatPr — 시트 기본 서식(행높이 등). 빈 새 워크북 정답지 byte. Excel 필수. */
export function encodeBrtSheetFormatPr(): Uint8Array {
  return encodeRecord(
    REC.BrtSheetFormatPr,
    Uint8Array.from([0xff, 0xff, 0xff, 0xff, 0x08, 0x00, 0x4a, 0x01, 0x00, 0x00, 0x00, 0x00]),
  );
}

/** BrtSel — worksheet 선택 영역. boa-sample 정답지 byte 템플릿(pane bottomRight, A1 선택). */
export function encodeBrtSel(): Uint8Array {
  return encodeRecord(
    REC.BrtSel,
    Uint8Array.from([
      0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]),
  );
}

/** BrtBeginAFilter — ref RfX(16): autoFilter 범위. */
export function encodeBrtBeginAFilter(
  s: { r: number; c: number },
  e: { r: number; c: number },
): Uint8Array {
  const payload = new Uint8Array(16);
  writeUint32LE(payload, 0, s.r);
  writeUint32LE(payload, 4, e.r);
  writeUint32LE(payload, 8, s.c);
  writeUint32LE(payload, 12, e.c);
  return encodeRecord(REC.BrtBeginAFilter, payload);
}

// 빈 새 워크북 정답지(통합 문서1.xlsb) BrtBeginWsView. grbit 0x03dc(격자선 ON). @18 wScale 은 encode 가 덮어쓴다.
const WSVIEW_TEMPLATE = Uint8Array.from(
  "dc 03 00 00 00 00 00 00 00 00 00 00 00 00 40 00 00 00 64 00 00 00 00 00 00 00 00 00 00 00"
    .split(" ")
    .map((x) => parseInt(x, 16)),
);

/**
 * BrtBeginWsView — 정답지(boa-sample) 30B 템플릿. wScale(zoom, u16@18)만 치환.
 * @param zoom 확대비율(%). 0/100 은 기본.
 */
export function encodeBrtBeginWsView(zoom: number): Uint8Array {
  const p = WSVIEW_TEMPLATE.slice();
  p[18] = zoom & 0xff;
  p[19] = (zoom >>> 8) & 0xff;
  return encodeRecord(REC.BrtBeginWsView, p);
}

/**
 * BrtPane(29B) — xnumXSplit(double@0) + ynumYSplit(double@8) + rwTop(u32@16) + colLeft(u32@20)
 * + pnnAcc(u32@24) + flags(u8@28). flags=3(fFrozen|fFrozenNoSplit).
 * pnnAcc: 0=bottomRight, 1=topRight, 2=bottomLeft, 3=topLeft.
 */
export function encodeBrtPane(
  xSplit: number,
  ySplit: number,
  rwTop: number,
  colLeft: number,
  pnnAcc: number,
): Uint8Array {
  const p = new Uint8Array(29);
  const dv = new DataView(p.buffer);
  dv.setFloat64(0, xSplit, true);
  dv.setFloat64(8, ySplit, true);
  writeUint32LE(p, 16, rwTop);
  writeUint32LE(p, 20, colLeft);
  writeUint32LE(p, 24, pnnAcc);
  p[28] = 0x03;
  return encodeRecord(REC.BrtPane, p);
}

/**
 * BrtWsProp — [MS-XLSB] 2.4.823. 레이아웃(23B): flags(3B@0) + brtcolorTab(BrtColor 8B@3)
 * + 상수영역(8B@11, ff×8) + codeName(XLWideString@19, 빈 문자열 4B).
 * BrtColor(@3): byteA(bit0=fValidRGB, bits1-7=xColorType) + index(1) + nTintAndShade(i16)
 *               + R + G + B + A.
 *
 * 정답지(`.tmp/탭색.xlsb` sheet1.bin BrtWsProp): 빈 워크북 대비 byte0 bit1(0x02) set,
 * @3=07(theme), @4=05(theme idx accent2), @7-10=E9 71 32 FF(resolved RGBA). 본 함수는 사용자
 * 입력 RGB 를 RGB type(0x05)으로 인코딩(index 0, tint 0).
 */
export function encodeBrtWsProp(tabColorArgb?: string): Uint8Array {
  // 빈 새 워크북(통합 문서1.xlsb) 정답지 byte(23B, tabColor auto, codeName 없음).
  const p = Uint8Array.from([
    0xc9, 0x04, 0x02, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00,
  ]);
  if (tabColorArgb != null) {
    // 정답지 색상상태 flag: byte0 bit1 set.
    p[0] |= 0x02;
    // brtcolorTab(@3, 8B): byteA + index + nTintAndShade(2) + R + G + B + A
    p[3] = 0x05; // fValidRGB(0x01) | xColorType=RGB(2<<1)
    p[4] = 0x00; // index (RGB 에서는 무시)
    p[5] = 0x00;
    p[6] = 0x00; // nTintAndShade = 0
    p[7] = parseInt(tabColorArgb.slice(2, 4), 16); // R
    p[8] = parseInt(tabColorArgb.slice(4, 6), 16); // G
    p[9] = parseInt(tabColorArgb.slice(6, 8), 16); // B
    p[10] = parseInt(tabColorArgb.slice(0, 2), 16); // A
  }
  return encodeRecord(REC.BrtWsProp, p);
}

/** BrtDrawing — XLWideString(r:id). 워크시트의 drawing 파트 참조. */
export function encodeBrtDrawing(relId: string): Uint8Array {
  return encodeRecord(REC.BrtDrawing, encodeXLWideString(relId));
}

/**
 * BrtFmlaNum — 수식 셀(숫자 결과).
 * cellprefix(8) + xnum(double 8, 캐시값=0) + grbit(2) + CellParsedFormula(cce u32 + rgce + cb u32=0).
 */
export function encodeBrtFmlaNum(col: number, iStyleRef: number, rgce: Uint8Array): Uint8Array {
  const payload = new Uint8Array(8 + 8 + 2 + 4 + rgce.length + 4);
  writeCellPrefix(payload, 0, col, iStyleRef);
  // xnum(8) = 0, grbit(2) = 0
  writeUint32LE(payload, 18, rgce.length); // cce
  payload.set(rgce, 22);
  writeUint32LE(payload, 22 + rgce.length, 0); // cb
  return encodeRecord(REC.BrtFmlaNum, payload);
}

// --- 조건부 서식 / dxf : [MS-XLSB] 정확 인코딩 ---

/**
 * XFPropColor([MS-XLSB] 2.5.161, 8B) — A|xclrType(1) + icv(1) + nTintShade(i16) + LongRGBA(R,G,B,A).
 * ARGB "AARRGGBB" 를 RGB type(xclrType=2)으로 인코딩.
 */
function encodeXFPropColor(argb: string): Uint8Array {
  return Uint8Array.from([
    0x05, // fValidRGBA(0x01) | xclrType=RGB(2<<1)
    0x00, // icv (RGB 에서 무시)
    0x00,
    0x00, // nTintShade = 0
    parseInt(argb.slice(2, 4), 16), // R
    parseInt(argb.slice(4, 6), 16), // G
    parseInt(argb.slice(6, 8), 16), // B
    parseInt(argb.slice(0, 2), 16), // A
  ]);
}

/** XFProp([MS-XLSB] 2.5.159) — xfPropType(u16) + cb(u16, 구조체 전체 크기=4+blob) + blob. */
function encodeXFProp(type: number, blob: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + blob.length);
  out[0] = type & 0xff;
  out[1] = (type >>> 8) & 0xff;
  const cb = 4 + blob.length;
  out[2] = cb & 0xff;
  out[3] = (cb >>> 8) & 0xff;
  out.set(blob, 4);
  return out;
}

/**
 * BrtDXF — [MS-XLSB] 2.4.359. header(u16, @bit15 fNewBorder) + XFProps(reserved u16 + cprops u16 + XFProp[]).
 * background → FillPattern(0x00=solid) + bgColor(0x02), fontColor → text color(0x05), bold → Bold(0x19, 700).
 * CF 채우기는 xlsx dxf 와 동일하게 patternType=solid + bgColor 조합(색은 bgColor 에). XFPropColor(RGB), ARGB "AARRGGBB".
 */
export function encodeBrtDXF(background?: string, fontColor?: string, bold?: boolean): Uint8Array {
  const props: Uint8Array[] = [];
  if (background != null) {
    props.push(encodeXFProp(0x00, Uint8Array.from([0x01]))); // FillPattern = solid(1)
    props.push(encodeXFProp(0x02, encodeXFPropColor(background))); // bgColor (채우기 색)
  }
  if (fontColor != null) {
    props.push(encodeXFProp(0x05, encodeXFPropColor(fontColor))); // text color
  }
  if (bold === true) {
    props.push(encodeXFProp(0x19, Uint8Array.from([0xbc, 0x02]))); // Bold = 700
  }
  const body = concatBytes(props);
  const payload = new Uint8Array(6 + body.length);
  payload[1] = 0x80; // header: fNewBorder(bit15) — 빈 워크북/boa 정답지 기본값
  payload[4] = props.length & 0xff; // cprops
  payload[5] = (props.length >>> 8) & 0xff;
  payload.set(body, 6);
  return encodeRecord(REC.BrtDXF, payload);
}

/**
 * BrtBeginConditionalFormatting — [MS-XLSB] 2.4.34.
 * ccf(u32, 규칙 수) + flags(u32, fPivot 등=0) + SqRfX(crfx u32 + crfx×RfX{rwFirst,rwLast,colFirst,colLast}).
 * sqref 는 공백 구분 다중 범위 가능.
 */
export function encodeBrtBeginConditionalFormatting(sqref: string, ccf: number): Uint8Array {
  const ranges = sqref
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0)
    .map((s) => ExcelUtils.parseRangeAddr(s));
  const payload = new Uint8Array(8 + 4 + ranges.length * 16);
  writeUint32LE(payload, 0, ccf);
  writeUint32LE(payload, 4, 0); // flags
  writeUint32LE(payload, 8, ranges.length); // crfx
  let off = 12;
  for (const r of ranges) {
    writeUint32LE(payload, off, r.s.r); // rwFirst
    writeUint32LE(payload, off + 4, r.e.r); // rwLast
    writeUint32LE(payload, off + 8, r.s.c); // colFirst
    writeUint32LE(payload, off + 12, r.e.c); // colLast
    off += 16;
  }
  return encodeRecord(REC.BrtBeginConditionalFormatting, payload);
}

/** CFParsedFormula([MS-XLSB] 2.5.98.6) — cce(u32) + rgce + cb(u32=rgcb 길이=0). */
function encodeCFParsedFormula(rgce: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + rgce.length + 4);
  writeUint32LE(out, 0, rgce.length);
  out.set(rgce, 4);
  // 끝 4byte(rgcb 길이) = 0
  return out;
}

/** XLNullableWideString — NULL 은 cchCharacters=0xFFFFFFFF, 그 외는 XLWideString 과 동일. */
function encodeXLNullableWideString(s?: string): Uint8Array {
  if (s == null) return Uint8Array.from([0xff, 0xff, 0xff, 0xff]);
  return encodeXLWideString(s);
}

/** CFOper([MS-XLSB] 2.5.15) — cellIs operator → iParam. */
const CF_OPER: Record<string, number> = {
  between: 1,
  notBetween: 2,
  equal: 3,
  notEqual: 4,
  greaterThan: 5,
  lessThan: 6,
  greaterThanOrEqual: 7,
  lessThanOrEqual: 8,
};

/** CFTextOper([MS-XLSB] 2.5.17) — text rule operator → iParam. */
const CF_TEXTOPER: Record<string, number> = {
  containsText: 0,
  notContains: 1,
  beginsWith: 2,
  endsWith: 3,
};

/**
 * CONTAINSTEXT 규칙의 구현 수식 rgce. Ptg 시퀀스([MS-XLS] Ftab / [MS-XLSB] 2.5.97).
 * PtgRefN row/col=0(상대) → 범위 내 각 셀이 자기 자신을 참조(범위 무관). ref-class 토큰(0x41/0x42/0x4c).
 *
 * - contains(0):    NOT(ISERROR(SEARCH(text, 셀)))   ← boa 정답지 검증
 * - notContains(1): ISERROR(SEARCH(text, 셀))         ← boa 정답지 검증
 * - beginsWith(2):  LEFT(셀, LEN(text)) = text         ← Ftab LEFT=0x73, LEN=0x20 ([MS-XLSB] 확정)
 * - endsWith(3):    RIGHT(셀, LEN(text)) = text        ← Ftab RIGHT=0x74, LEN=0x20 ([MS-XLSB] 확정)
 *
 * @param textOper CF_TEXTOPER (0=contains, 1=notContains, 2=beginsWith, 3=endsWith)
 */
function encodeCfTextRgce(textOper: number, text: string): Uint8Array {
  const ptgStr = (s: string): number[] => {
    const b = [0x17, s.length & 0xff, (s.length >>> 8) & 0xff];
    for (const ch of s) {
      const c = ch.charCodeAt(0);
      b.push(c & 0xff, (c >>> 8) & 0xff);
    }
    return b;
  };
  const ptgRefN = [0x4c, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc0]; // row u32=0 + col u16=0xC000(상대)

  if (textOper === 0 || textOper === 1) {
    const out = [...ptgStr(text), ...ptgRefN, 0x42, 0x02, 0x52, 0x00, 0x41, 0x03, 0x00]; // SEARCH(82),ISERROR(3)
    if (textOper === 0) out.push(0x41, 0x26, 0x00); // NOT(38) — contains 만
    return Uint8Array.from(out);
  }

  // beginsWith / endsWith: LEFT|RIGHT(셀, LEN(text)) = text
  const fn = textOper === 2 ? 0x73 : 0x74; // LEFT=0x73 / RIGHT=0x74
  return Uint8Array.from([
    ...ptgRefN, // 셀
    ...ptgStr(text), // text
    0x41, 0x20, 0x00, // PtgFunc LEN(32) → LEN(text)
    0x42, 0x02, fn, 0x00, // PtgFuncVar LEFT|RIGHT argc=2 → LEFT/RIGHT(셀, LEN(text))
    ...ptgStr(text), // text
    0x0b, // PtgEq → ... = text
  ]);
}

/**
 * BrtBeginCFRule — [MS-XLSB] 2.4.23.
 * iType(4) + iTemplate(4) + dxfId(4) + iPri(4) + iParam(4) + reserved1(4) + reserved2(4)
 * + flags(2) + cbFmla1(4) + cbFmla2(4) + cbFmla3(4) + strParam(XLNullableWideString)
 * + rgce1?(CFParsedFormula) + rgce2?.
 *
 * - cellIs: iType=CELLIS(1), iTemplate=EXPR(0), iParam=CFOper, rgce1(+between/notBetween 시 rgce2).
 * - expression: iType=EXPRIS(2), iTemplate=FMLA(1), rgce1.
 * - text(contains/notContains/begins/ends): iType=EXPRIS(2), iTemplate=CONTAINSTEXT(8),
 *   iParam=CFTextOper, strParam=text. rgce1(검색식)은 함수 Ptg 라 미인코딩(cbFmla1=0) — Excel 이
 *   strParam+CFTextOper 로 규칙을 재구성하도록 위임(Excel 호환 검증 대상).
 */
export function encodeBrtBeginCFRule(
  dxfId: number,
  priority: number,
  spec: ICfRuleSpec,
): Uint8Array {
  let iType: number;
  let iTemplate: number;
  let iParam = 0;
  let strParam: string | undefined;
  let rgce1: Uint8Array | undefined;
  let rgce2: Uint8Array | undefined;

  if (spec.type === "cellIs") {
    iType = 1; // CF_TYPE_CELLIS
    iTemplate = 0; // CF_TEMPLATE_EXPR
    iParam = CF_OPER[spec.operator ?? "equal"];
    rgce1 = encodeFormula(spec.formula[0]);
    if (spec.operator === "between" || spec.operator === "notBetween") {
      rgce2 = encodeFormula(spec.formula[1]);
    }
  } else if (spec.type === "expression") {
    iType = 2; // CF_TYPE_EXPRIS
    iTemplate = 1; // CF_TEMPLATE_FMLA
    rgce1 = encodeFormula(spec.formula[0]);
  } else {
    iType = 2; // CF_TYPE_EXPRIS
    iTemplate = 8; // CF_TEMPLATE_CONTAINSTEXT
    iParam = CF_TEXTOPER[spec.operator ?? "containsText"];
    strParam = spec.text;
    // contains/notContains 는 boa 검증, beginsWith/endsWith 는 Ftab 추측(Excel 검증 대상).
    rgce1 = encodeCfTextRgce(iParam, spec.text ?? "");
  }

  const cf1 = encodeCFParsedFormula(rgce1);
  const cf2 = rgce2 != null ? encodeCFParsedFormula(rgce2) : undefined;

  const head = new Uint8Array(42);
  writeUint32LE(head, 0, iType);
  writeUint32LE(head, 4, iTemplate);
  writeUint32LE(head, 8, dxfId);
  writeUint32LE(head, 12, priority);
  writeUint32LE(head, 16, iParam);
  // reserved1@20, reserved2@24, flags@28(2byte) = 0
  writeUint32LE(head, 30, cf1.length); // cbFmla1
  writeUint32LE(head, 34, cf2 != null ? cf2.length : 0); // cbFmla2
  writeUint32LE(head, 38, 0); // cbFmla3

  const parts: Uint8Array[] = [head, encodeXLNullableWideString(strParam), cf1];
  if (cf2 != null) parts.push(cf2);
  return encodeRecord(REC.BrtBeginCFRule, concatBytes(parts));
}

//#endregion
