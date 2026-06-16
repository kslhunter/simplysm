import { describe, expect, it } from "vitest";
import { readAllRecords, REC } from "../../src/biff/biff12-codec";
import { encodeBrtBeginCFRule } from "../../src/biff/biff-records";
import type { ICfRuleSpec } from "../../src/models/shared/excel-cf-spec";

/** encodeBrtBeginCFRule 결과(record) → payload byte. */
function cfRulePayload(dxfId: number, priority: number, spec: ICfRuleSpec): Uint8Array {
  const recs = readAllRecords(encodeBrtBeginCFRule(dxfId, priority, spec));
  expect(recs.length).toBe(1);
  expect(recs[0].type).toBe(REC.BrtBeginCFRule);
  return recs[0].payload;
}

function u32(p: Uint8Array, off: number): number {
  return (p[off] | (p[off + 1] << 8) | (p[off + 2] << 16) | (p[off + 3] << 24)) >>> 0;
}

/** payload 안에 byte 부분열이 존재하는지. */
function includesSeq(p: Uint8Array, seq: number[]): boolean {
  for (let i = 0; i + seq.length <= p.length; i++) {
    let ok = true;
    for (let k = 0; k < seq.length; k++) {
      if (p[i + k] !== seq[k]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/**
 * BrtBeginCFRule 인코딩의 byte 민감 부분([MS-XLSB] iType/iTemplate/iParam, rgce Ftab/Ptg) 고정.
 * 텍스트 규칙 rgce 는 boa-sample 정답지(contains) + Ftab 확정값(begins/ends)으로 검증된 시퀀스.
 */
describe("encodeBrtBeginCFRule ([MS-XLSB] 2.4.23) byte 고정", () => {
  it("cellIs: iType=CELLIS(1), iTemplate=EXPR(0), iParam=CFOper", () => {
    const p = cfRulePayload(0, 1, {
      type: "cellIs",
      operator: "greaterThan",
      formula: ["25"],
    });
    expect(u32(p, 0)).toBe(1); // iType CELLIS
    expect(u32(p, 4)).toBe(0); // iTemplate EXPR
    expect(u32(p, 16)).toBe(5); // iParam CF_OPER_GT
    // strParam = NULL(0xFFFFFFFF)
    expect(includesSeq(p, [0xff, 0xff, 0xff, 0xff])).toBe(true);
  });

  it("contains: EXPRIS(2)+CONTAINSTEXT(8)+CFTextOper(0), rgce=NOT(ISERROR(SEARCH))", () => {
    const p = cfRulePayload(0, 1, {
      type: "containsText",
      operator: "containsText",
      text: "사",
      formula: [],
    });
    expect(u32(p, 0)).toBe(2); // iType EXPRIS
    expect(u32(p, 4)).toBe(8); // iTemplate CONTAINSTEXT
    expect(u32(p, 16)).toBe(0); // iParam CF_TEXTOPER_CONTAINS
    expect(includesSeq(p, [0x42, 0x02, 0x52, 0x00])).toBe(true); // PtgFuncVar SEARCH(0x52) argc=2
    expect(includesSeq(p, [0x41, 0x03, 0x00])).toBe(true); // PtgFunc ISERROR(0x03)
    expect(includesSeq(p, [0x41, 0x26, 0x00])).toBe(true); // PtgFunc NOT(0x26)
  });

  it("notContains: iParam=1, rgce=ISERROR(SEARCH) (NOT 없음)", () => {
    const p = cfRulePayload(0, 1, {
      type: "notContainsText",
      operator: "notContains",
      text: "x",
      formula: [],
    });
    expect(u32(p, 16)).toBe(1); // CF_TEXTOPER_NOTCONTAINS
    expect(includesSeq(p, [0x42, 0x02, 0x52, 0x00])).toBe(true); // SEARCH
    expect(includesSeq(p, [0x41, 0x03, 0x00])).toBe(true); // ISERROR
    expect(includesSeq(p, [0x41, 0x26, 0x00])).toBe(false); // NOT 없어야 함
  });

  it("beginsWith: iParam=2, rgce=LEFT(0x73)+LEN(0x20)", () => {
    const p = cfRulePayload(0, 1, {
      type: "beginsWith",
      operator: "beginsWith",
      text: "사",
      formula: [],
    });
    expect(u32(p, 16)).toBe(2); // CF_TEXTOPER_BEGINSWITH
    expect(includesSeq(p, [0x41, 0x20, 0x00])).toBe(true); // PtgFunc LEN(0x20)
    expect(includesSeq(p, [0x42, 0x02, 0x73, 0x00])).toBe(true); // PtgFuncVar LEFT(0x73) argc=2
  });

  it("endsWith: iParam=3, rgce=RIGHT(0x74)+LEN(0x20)", () => {
    const p = cfRulePayload(0, 1, {
      type: "endsWith",
      operator: "endsWith",
      text: "과",
      formula: [],
    });
    expect(u32(p, 16)).toBe(3); // CF_TEXTOPER_ENDSWITH
    expect(includesSeq(p, [0x41, 0x20, 0x00])).toBe(true); // LEN
    expect(includesSeq(p, [0x42, 0x02, 0x74, 0x00])).toBe(true); // RIGHT(0x74)
  });
});
