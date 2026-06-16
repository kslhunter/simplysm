import { describe, expect, it } from "vitest";
import {
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
} from "../../src/biff/biff12-codec";

describe("biff12-codec — record 프레이밍", () => {
  it("encodeRecord → readAllRecords 라운드트립 (1-byte type)", () => {
    const buf = encodeRecord(REC.BrtCellBlank, new Uint8Array([1, 2, 3]));
    const recs = readAllRecords(buf);
    expect(recs.length).toBe(1);
    expect(recs[0].type).toBe(REC.BrtCellBlank);
    expect([...recs[0].payload]).toEqual([1, 2, 3]);
  });

  it("2-byte varint type(>=0x80) 라운드트립", () => {
    const buf = encodeRecord(REC.BrtBeginSheetData, new Uint8Array(0)); // 0x0091
    const recs = readAllRecords(buf);
    expect(recs[0].type).toBe(REC.BrtBeginSheetData);
    expect(recs[0].payload.length).toBe(0);
  });

  it("길이 varint(>0x7f) 라운드트립", () => {
    const buf = encodeRecord(REC.BrtSSTItem, new Uint8Array(200).fill(7));
    const recs = readAllRecords(buf);
    expect(recs[0].payload.length).toBe(200);
    expect(recs[0].payload[199]).toBe(7);
  });

  it("연속 record 순회", () => {
    const a = encodeRecord(REC.BrtCellBlank, new Uint8Array([1]));
    const b = encodeRecord(REC.BrtBeginSheetData, new Uint8Array(0));
    const buf = new Uint8Array(a.length + b.length);
    buf.set(a, 0);
    buf.set(b, a.length);
    const recs = readAllRecords(buf);
    expect(recs.map((r) => r.type)).toEqual([REC.BrtCellBlank, REC.BrtBeginSheetData]);
    expect(recs[1].offset).toBe(a.length);
  });
});

describe("biff12-codec — 프리미티브", () => {
  it("UInt32LE 라운드트립", () => {
    const buf = new Uint8Array(4);
    writeUint32LE(buf, 0, 0x12345678);
    expect(readUint32LE(buf, 0)).toBe(0x12345678);
  });

  it("cell prefix(col+iStyleRef 24bit) 라운드트립", () => {
    const buf = new Uint8Array(8);
    writeCellPrefix(buf, 0, 1234, 0x0a0b0c);
    const { col, iStyleRef } = readCellPrefix(buf);
    expect(col).toBe(1234);
    expect(iStyleRef).toBe(0x0a0b0c);
  });

  it("XLWideString 라운드트립(유니코드)", () => {
    const enc = encodeXLWideString("재고 A1");
    const { value, bytesRead } = readXLWideString(enc, 0);
    expect(value).toBe("재고 A1");
    expect(bytesRead).toBe(enc.length);
  });
});

describe("biff12-codec — RK number decode", () => {
  it("정수 RK", () => {
    // fInt=1, fX100=0, value=5 → rk = (5<<2)|0x02
    expect(decodeRkNumber((5 << 2) | 0x02)).toBe(5);
  });

  it("정수 RK /100", () => {
    // fInt=1, fX100=1, value=5 → 5/100
    expect(decodeRkNumber((5 << 2) | 0x03)).toBeCloseTo(0.05);
  });

  it("double RK(IEEE754 상위 30bit)", () => {
    // value=2.0 의 double 상위 32bit = 0x40000000. RK = 상위32bit & 0xFFFFFFFC (fInt=fX100=0)
    expect(decodeRkNumber(0x40000000)).toBe(2);
  });
});
