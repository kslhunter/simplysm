/**
 * BIFF12 (MS-XLSB) record 프레이밍 + 프리미티브 코덱.
 *
 * adtek `biff12.ts` 에서 포팅한 재사용 기반(varint record 프레이밍·LE r/w·XLWideString·cell prefix·RK decode).
 * 레코드 종류별 encode/decode 는 `biff-records.ts`, 모델 단위 직렬화는 `biff-*-model.ts` 가 담당한다.
 *
 * record 형식:
 * - type ID: 1~2 byte varint (high bit = continuation)
 * - length: 1~4 byte varint
 * - payload: length byte
 *
 * 브라우저/Node 양쪽 동작을 위해 `Buffer` 를 쓰지 않고 `Uint8Array`/`DataView` 만 사용한다.
 */

/** BIFF12 record type ID 상수. ([MS-XLSB] record 번호) */
export const REC = {
  BrtRowHdr: 0x0000,
  BrtCellRk: 0x0002,
  BrtCellReal: 0x0005,
  BrtCellSt: 0x0006,
  BrtCellIsst: 0x0007,
  BrtBeginSheetData: 0x0091,
  BrtEndSheetData: 0x0092,
  BrtCellBlank: 0x0001,
  BrtCellBool: 0x0004,
  BrtWsDim: 0x0094,
  BrtSSTItem: 0x0013,
  BrtBundleSh: 0x009c,
  /** BrtColInfo (0x003c): 컬럼 메타 (colFirst/colLast/coldx/ixfe). 컬럼 기본 셀 서식. */
  BrtColInfo: 0x003c,
  /**
   * "Short" cell variants — sheet-js 가 iStyleRef=0 인 cell 에 사용.
   * prefix 가 8 byte (col+iStyleRef+phShow) 대신 4 byte (col 만).
   */
  BrtShortBlank: 0x000c,
  BrtShortRk: 0x000d,
  BrtShortReal: 0x0010,
  BrtShortSt: 0x0011,
  BrtShortIsst: 0x0012,
  // 컨테이너 begin/end — boa-sample.xlsb 정답지로 확정한 record ID.
  BrtBeginBook: 0x0083,
  BrtEndBook: 0x0084,
  BrtBeginBundleShs: 0x008f,
  BrtEndBundleShs: 0x0090,
  BrtBeginSst: 0x009f,
  BrtEndSst: 0x00a0,
  BrtBeginSheet: 0x0081,
  BrtEndSheet: 0x0082,
  // 병합/뷰/컬럼/autoFilter
  BrtMergeCell: 0x00b0,
  BrtBeginMergeCells: 0x00b1,
  BrtEndMergeCells: 0x00b2,
  BrtBeginAFilter: 0x00a1,
  BrtEndAFilter: 0x00a2,
  BrtBeginColInfos: 0x0186,
  BrtEndColInfos: 0x0187,
  BrtPane: 0x0097,
  BrtBeginWsView: 0x0089,
  BrtEndWsView: 0x008a,
  BrtBeginWsViews: 0x0085,
  BrtEndWsViews: 0x0086,
  BrtSel: 0x0098,
  BrtBeginBookViews: 0x0087,
  BrtEndBookViews: 0x0088,
  BrtBookView: 0x009e,
  BrtWbProp: 0x0099,
  BrtFileVersion: 0x0080,
  BrtSheetFormatPr: 0x01e5,
  BrtWsProp: 0x0093,
  // 스타일(styles.bin)
  BrtFmt: 0x002c,
  BrtXF: 0x002f,
  BrtBeginCellXFs: 0x0269,
  BrtEndCellXFs: 0x026a,
  BrtBeginStyleSheet: 0x0116,
  BrtEndStyleSheet: 0x0117,
  BrtBeginFmts: 0x0267,
  BrtEndFmts: 0x0268,
  BrtFont: 0x002b,
  BrtBeginFonts: 0x0263,
  BrtEndFonts: 0x0264,
  BrtFill: 0x002d,
  BrtBeginFills: 0x025b,
  BrtEndFills: 0x025c,
  BrtBorder: 0x002e,
  BrtBeginBorders: 0x0265,
  BrtEndBorders: 0x0266,
  BrtBeginCellStyleXFs: 0x0272,
  BrtEndCellStyleXFs: 0x0273,
  // 이미지(drawing)
  BrtDrawing: 0x0226,
  // 조건부 서식
  BrtBeginConditionalFormatting: 0x01cd,
  BrtEndConditionalFormatting: 0x01ce,
  BrtBeginCFRule: 0x01cf,
  BrtEndCFRule: 0x01d0,
  BrtBeginDXFs: 0x01f9,
  BrtEndDXFs: 0x01fa,
  BrtDXF: 0x01fb,
  // 수식 셀
  BrtFmlaString: 0x0008,
  BrtFmlaNum: 0x0009,
  BrtFmlaBool: 0x000a,
  BrtFmlaError: 0x000b,
} as const;

/** Excel serial(1900 base) ↔ Unix epoch 일수 오프셋. */
export const EXCEL_EPOCH_OFFSET = 25569;

export interface IRecord {
  type: number;
  payload: Uint8Array;
  /** 원본 buffer 안 record header 시작 offset (insert point 계산용) */
  offset: number;
  /** record 전체 크기(header + payload) */
  totalLength: number;
}

/** buffer 의 모든 record 를 순회. */
export function readAllRecords(buf: Uint8Array): IRecord[] {
  const out: IRecord[] = [];
  let pos = 0;
  while (pos < buf.length) {
    const start = pos;
    let type: number;
    if ((buf[pos] & 0x80) === 0) {
      type = buf[pos];
      pos += 1;
    } else {
      type = (buf[pos] & 0x7f) | (buf[pos + 1] << 7);
      pos += 2;
    }
    let length = 0;
    let shift = 0;
    for (let i = 0; i < 4; i++) {
      const b = buf[pos];
      pos += 1;
      length |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    const payload = buf.subarray(pos, pos + length);
    pos += length;
    out.push({ type, payload, offset: start, totalLength: pos - start });
  }
  return out;
}

/** record header(type+length) 를 byte 배열로 직렬화. */
export function encodeRecordHeader(type: number, length: number): Uint8Array {
  const bytes: number[] = [];
  if (type < 0x80) {
    bytes.push(type);
  } else {
    bytes.push((type & 0x7f) | 0x80);
    bytes.push((type >> 7) & 0xff);
  }
  let remain = length;
  do {
    let b = remain & 0x7f;
    remain >>>= 7;
    if (remain > 0) b |= 0x80;
    bytes.push(b);
  } while (remain > 0);
  return new Uint8Array(bytes);
}

/** record (header + payload) 직렬화. */
export function encodeRecord(type: number, payload: Uint8Array): Uint8Array {
  const header = encodeRecordHeader(type, payload.length);
  const out = new Uint8Array(header.length + payload.length);
  out.set(header, 0);
  out.set(payload, header.length);
  return out;
}

/** UInt32LE write. */
export function writeUint32LE(buf: Uint8Array, off: number, v: number): void {
  buf[off] = v & 0xff;
  buf[off + 1] = (v >>> 8) & 0xff;
  buf[off + 2] = (v >>> 16) & 0xff;
  buf[off + 3] = (v >>> 24) & 0xff;
}

/** UInt32LE read. */
export function readUint32LE(buf: Uint8Array, off: number): number {
  return (
    (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0
  );
}

/**
 * BIFF12 cell record 의 prefix 8 byte (col + iStyleRef + flag) 읽기.
 *
 * Layout:
 * - 4 byte: col index (UInt32LE)
 * - 3 byte: iStyleRef (24-bit LE)
 * - 1 byte: cellPhShow (보통 0)
 */
export function readCellPrefix(payload: Uint8Array): { col: number; iStyleRef: number } {
  const col = readUint32LE(payload, 0);
  const iStyleRef = payload[4] | (payload[5] << 8) | (payload[6] << 16);
  return { col, iStyleRef };
}

/** cell prefix 8 byte 작성. */
export function writeCellPrefix(
  buf: Uint8Array,
  off: number,
  col: number,
  iStyleRef: number,
): void {
  writeUint32LE(buf, off, col);
  buf[off + 4] = iStyleRef & 0xff;
  buf[off + 5] = (iStyleRef >>> 8) & 0xff;
  buf[off + 6] = (iStyleRef >>> 16) & 0xff;
  buf[off + 7] = 0; // cellPhShow
}

/** XLWideString 작성 (UInt32 length + UTF-16LE chars). */
export function encodeXLWideString(s: string): Uint8Array {
  const out = new Uint8Array(4 + s.length * 2);
  writeUint32LE(out, 0, s.length);
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    out[4 + i * 2] = code & 0xff;
    out[4 + i * 2 + 1] = (code >>> 8) & 0xff;
  }
  return out;
}

/**
 * XLWideString read — UInt32 length + UTF-16LE chars.
 * @returns value 와 소비한 byte 수 (4 + length*2).
 */
export function readXLWideString(
  payload: Uint8Array,
  offset: number,
): { value: string; bytesRead: number } {
  const length = readUint32LE(payload, offset);
  let s = "";
  for (let i = 0; i < length; i++) {
    const lo = payload[offset + 4 + i * 2];
    const hi = payload[offset + 4 + i * 2 + 1];
    s += String.fromCharCode(lo | (hi << 8));
  }
  return { value: s, bytesRead: 4 + length * 2 };
}

/** BrtCellRk 의 RK number decode. */
export function decodeRkNumber(rk: number): number {
  const fX100 = (rk & 0x1) !== 0;
  const fInt = (rk & 0x2) !== 0;
  let value: number;
  if (fInt) {
    let v = rk >> 2;
    if ((v & 0x20000000) !== 0) v -= 0x40000000;
    value = v;
  } else {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint32(4, rk & 0xfffffffc, true);
    view.setUint32(0, 0, true);
    value = view.getFloat64(0, true);
  }
  if (fX100) value /= 100;
  return value;
}

/** Excel serial number(1900 base, UTC) → JS Date. */
export function excelSerialToDate(serial: number): Date {
  return new Date(Math.round((serial - EXCEL_EPOCH_OFFSET) * 86400000));
}
