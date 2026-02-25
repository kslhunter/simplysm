import { describe, expect, it } from "vitest";
import { ExcelUtils } from "../../src/utils/excel-utils";

describe("ExcelUtils", () => {
  describe("stringifyColAddr / parseColAddrCode", () => {
    it("converts 0-25 to A-Z", () => {
      expect(ExcelUtils.stringifyColAddr(0)).toBe("A");
      expect(ExcelUtils.stringifyColAddr(1)).toBe("B");
      expect(ExcelUtils.stringifyColAddr(25)).toBe("Z");
    });

    it("converts 26 and above to AA, AB, etc.", () => {
      expect(ExcelUtils.stringifyColAddr(26)).toBe("AA");
      expect(ExcelUtils.stringifyColAddr(27)).toBe("AB");
      expect(ExcelUtils.stringifyColAddr(51)).toBe("AZ");
      expect(ExcelUtils.stringifyColAddr(52)).toBe("BA");
    });

    it("handles large column indices", () => {
      // 702 = AAA (26^2 + 26 = 702)
      expect(ExcelUtils.stringifyColAddr(702)).toBe("AAA");
    });

    it("handles Excel maximum column index (XFD, 16383)", () => {
      // Excel 최대 열은 XFD (16383번 인덱스, 0-based)
      expect(ExcelUtils.stringifyColAddr(16383)).toBe("XFD");
      expect(ExcelUtils.parseColAddrCode("XFD")).toBe(16383);
    });

    it("parses A-Z to 0-25", () => {
      expect(ExcelUtils.parseColAddrCode("A")).toBe(0);
      expect(ExcelUtils.parseColAddrCode("B")).toBe(1);
      expect(ExcelUtils.parseColAddrCode("Z")).toBe(25);
    });

    it("parses AA, AB, etc. to 26 and above", () => {
      expect(ExcelUtils.parseColAddrCode("AA")).toBe(26);
      expect(ExcelUtils.parseColAddrCode("AB")).toBe(27);
      expect(ExcelUtils.parseColAddrCode("AZ")).toBe(51);
      expect(ExcelUtils.parseColAddrCode("BA")).toBe(52);
    });

    it("parses column index from cell address", () => {
      expect(ExcelUtils.parseColAddrCode("A1")).toBe(0);
      expect(ExcelUtils.parseColAddrCode("B10")).toBe(1);
      expect(ExcelUtils.parseColAddrCode("AA100")).toBe(26);
    });

    it("round-trip: stringify → parse returns original value", () => {
      for (let i = 0; i < 100; i++) {
        const stringified = ExcelUtils.stringifyColAddr(i);
        const parsed = ExcelUtils.parseColAddrCode(stringified);
        expect(parsed).toBe(i);
      }
    });

    it("throws error on negative column index input", () => {
      expect(() => ExcelUtils.stringifyColAddr(-1)).toThrow();
      expect(() => ExcelUtils.stringifyColAddr(-100)).toThrow();
    });
  });

  describe("stringifyRowAddr / parseRowAddrCode", () => {
    it("converts 0-based index to 1-based string", () => {
      expect(ExcelUtils.stringifyRowAddr(0)).toBe("1");
      expect(ExcelUtils.stringifyRowAddr(9)).toBe("10");
      expect(ExcelUtils.stringifyRowAddr(99)).toBe("100");
    });

    it("parses 1-based string to 0-based index", () => {
      expect(ExcelUtils.parseRowAddrCode("A1")).toBe(0);
      expect(ExcelUtils.parseRowAddrCode("B10")).toBe(9);
      expect(ExcelUtils.parseRowAddrCode("AA100")).toBe(99);
    });
  });

  describe("stringifyAddr / parseCellAddrCode", () => {
    it("correctly converts cell address", () => {
      expect(ExcelUtils.stringifyAddr({ r: 0, c: 0 })).toBe("A1");
      expect(ExcelUtils.stringifyAddr({ r: 9, c: 1 })).toBe("B10");
      expect(ExcelUtils.stringifyAddr({ r: 99, c: 26 })).toBe("AA100");
    });

    it("correctly parses cell address", () => {
      expect(ExcelUtils.parseCellAddrCode("A1")).toEqual({ r: 0, c: 0 });
      expect(ExcelUtils.parseCellAddrCode("B10")).toEqual({ r: 9, c: 1 });
      expect(ExcelUtils.parseCellAddrCode("AA100")).toEqual({ r: 99, c: 26 });
    });
  });

  describe("parseRangeAddrCode / stringifyRangeAddr", () => {
    it("parses single cell range", () => {
      const range = ExcelUtils.parseRangeAddrCode("A1");
      expect(range.s).toEqual({ r: 0, c: 0 });
      expect(range.e).toEqual({ r: 0, c: 0 });
    });

    it("parses multi-cell range", () => {
      const range = ExcelUtils.parseRangeAddrCode("A1:C3");
      expect(range.s).toEqual({ r: 0, c: 0 });
      expect(range.e).toEqual({ r: 2, c: 2 });
    });

    it("converts single cell range to string", () => {
      const addr = ExcelUtils.stringifyRangeAddr({
        s: { r: 0, c: 0 },
        e: { r: 0, c: 0 },
      });
      expect(addr).toBe("A1");
    });

    it("converts multi-cell range to string", () => {
      const addr = ExcelUtils.stringifyRangeAddr({
        s: { r: 0, c: 0 },
        e: { r: 2, c: 2 },
      });
      expect(addr).toBe("A1:C3");
    });
  });

  describe("convertTimeTickToNumber / convertNumberToTimeTick", () => {
    it("correctly converts 1970-01-01", () => {
      const date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
      const tick = date.getTime();
      const excelNum = ExcelUtils.convertTimeTickToNumber(tick);
      // 1970-01-01은 Excel 기준 25569일째
      expect(excelNum).toBeCloseTo(25569, 0);
    });

    it("correctly converts 2024-06-15", () => {
      const date = new Date(Date.UTC(2024, 5, 15, 0, 0, 0));
      const tick = date.getTime();
      const excelNum = ExcelUtils.convertTimeTickToNumber(tick);
      // 대략적인 값 확인
      expect(excelNum).toBeGreaterThan(45000);
    });

    it("correctly converts date with time", () => {
      const date = new Date(Date.UTC(2024, 5, 15, 12, 0, 0));
      const tick = date.getTime();
      const excelNum = ExcelUtils.convertTimeTickToNumber(tick);
      // 12시 = 0.5일 추가
      const baseNum = ExcelUtils.convertTimeTickToNumber(
        new Date(Date.UTC(2024, 5, 15, 0, 0, 0)).getTime(),
      );
      expect(excelNum - baseNum).toBeCloseTo(0.5, 1);
    });

    it("round-trip: tick → number → tick returns original value", () => {
      const originalDate = new Date(Date.UTC(2024, 5, 15, 14, 30, 45));
      const tick = originalDate.getTime();
      const excelNum = ExcelUtils.convertTimeTickToNumber(tick);
      const recoveredTick = ExcelUtils.convertNumberToTimeTick(excelNum);
      // 밀리초 단위까지 정확히 일치하지 않을 수 있으므로 초 단위로 비교
      expect(Math.floor(recoveredTick / 1000)).toBe(Math.floor(tick / 1000));
    });
  });

  describe("convertNumFmtCodeToName", () => {
    it("recognizes General as number", () => {
      expect(ExcelUtils.convertNumFmtCodeToName("General")).toBe("number");
    });

    it("recognizes date pattern as DateOnly", () => {
      expect(ExcelUtils.convertNumFmtCodeToName("yyyy-mm-dd")).toBe("DateOnly");
      expect(ExcelUtils.convertNumFmtCodeToName("yy/mm/dd")).toBe("DateOnly");
      expect(ExcelUtils.convertNumFmtCodeToName("dd-mmm-yyyy")).toBe("DateOnly");
    });

    // NOTE: 현재 구현에서 'mm'은 날짜(month)와 시간(minute) 둘 다에서 사용됨
    // 정규식: hasDate = /yy|dd|mm/i, hasTime = /hh|ss/i
    // 따라서 "hh:mm:ss"는 hasDate(mm)=true, hasTime(hh,ss)=true → DateTime
    // "h:mm"은 hasDate(mm)=true, hasTime=false (h는 hh가 아님) → DateOnly
    it("handles time pattern (note mm ambiguity)", () => {
      // "hh:mm:ss": hasDate(mm)=true, hasTime(hh,ss)=true → DateTime
      expect(ExcelUtils.convertNumFmtCodeToName("hh:mm:ss")).toBe("DateTime");
      // "h:mm": hasDate(mm)=true, hasTime=false (h≠hh) → DateOnly
      expect(ExcelUtils.convertNumFmtCodeToName("h:mm")).toBe("DateOnly");
      // 순수 시간 포맷 (ss만 있고 mm 없는 경우)
      expect(ExcelUtils.convertNumFmtCodeToName("[h]:ss")).toBe("Time");
    });

    it("recognizes date+time pattern as DateTime", () => {
      expect(ExcelUtils.convertNumFmtCodeToName("yyyy-mm-dd hh:mm:ss")).toBe("DateTime");
      // "yy/mm/dd h:mm"는 날짜만 감지됨 (h:mm에서 hh가 아니고 ss도 없으므로)
      expect(ExcelUtils.convertNumFmtCodeToName("yy/mm/dd h:mm")).toBe("DateOnly");
      // 명확한 DateTime 패턴
      expect(ExcelUtils.convertNumFmtCodeToName("yyyy/mm/dd hh:mm:ss")).toBe("DateTime");
    });

    it("recognizes number pattern as number", () => {
      expect(ExcelUtils.convertNumFmtCodeToName("#,##0")).toBe("number");
      expect(ExcelUtils.convertNumFmtCodeToName("0.00")).toBe("number");
      expect(ExcelUtils.convertNumFmtCodeToName("#,0")).toBe("number");
    });

    it("throws error on unknown format code input", () => {
      expect(() => ExcelUtils.convertNumFmtCodeToName("unknown-format-xyz")).toThrow();
    });
  });

  describe("convertNumFmtIdToName", () => {
    it("recognizes common number formats", () => {
      expect(ExcelUtils.convertNumFmtIdToName(0)).toBe("number");
      expect(ExcelUtils.convertNumFmtIdToName(1)).toBe("number");
      expect(ExcelUtils.convertNumFmtIdToName(2)).toBe("number");
    });

    it("recognizes date format", () => {
      expect(ExcelUtils.convertNumFmtIdToName(14)).toBe("DateOnly");
      expect(ExcelUtils.convertNumFmtIdToName(15)).toBe("DateOnly");
    });

    it("recognizes date+time format", () => {
      expect(ExcelUtils.convertNumFmtIdToName(22)).toBe("DateTime");
    });

    it("recognizes time format", () => {
      expect(ExcelUtils.convertNumFmtIdToName(18)).toBe("Time");
      expect(ExcelUtils.convertNumFmtIdToName(19)).toBe("Time");
    });

    it("recognizes text format", () => {
      expect(ExcelUtils.convertNumFmtIdToName(49)).toBe("string");
    });

    it("throws error on unknown numFmtId input", () => {
      expect(() => ExcelUtils.convertNumFmtIdToName(23)).toThrow();
      expect(() => ExcelUtils.convertNumFmtIdToName(100)).toThrow();
    });
  });

  describe("convertNumFmtNameToId", () => {
    it("converts format name to ID", () => {
      expect(ExcelUtils.convertNumFmtNameToId("number")).toBe(0);
      expect(ExcelUtils.convertNumFmtNameToId("DateOnly")).toBe(14);
      expect(ExcelUtils.convertNumFmtNameToId("DateTime")).toBe(22);
      expect(ExcelUtils.convertNumFmtNameToId("Time")).toBe(18);
      expect(ExcelUtils.convertNumFmtNameToId("string")).toBe(49);
    });
  });
});
