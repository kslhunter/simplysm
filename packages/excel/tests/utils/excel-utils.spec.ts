import { describe, expect, it } from "vitest";
import { ExcelUtils } from "../../src/utils/excel-utils";

describe("ExcelUtils", () => {
  describe("stringifyColAddr / parseColAddrCode", () => {
    it("0-25를 A-Z로 변환한다", () => {
      expect(ExcelUtils.stringifyColAddr(0)).toBe("A");
      expect(ExcelUtils.stringifyColAddr(1)).toBe("B");
      expect(ExcelUtils.stringifyColAddr(25)).toBe("Z");
    });

    it("26 이상을 AA, AB 등으로 변환한다", () => {
      expect(ExcelUtils.stringifyColAddr(26)).toBe("AA");
      expect(ExcelUtils.stringifyColAddr(27)).toBe("AB");
      expect(ExcelUtils.stringifyColAddr(51)).toBe("AZ");
      expect(ExcelUtils.stringifyColAddr(52)).toBe("BA");
    });

    it("큰 열 인덱스도 처리한다", () => {
      // 702 = AAA (26^2 + 26 = 702)
      expect(ExcelUtils.stringifyColAddr(702)).toBe("AAA");
    });

    it("Excel 최대 열 인덱스(XFD, 16383)를 처리한다", () => {
      // Excel 최대 열은 XFD (16383번 인덱스, 0-based)
      expect(ExcelUtils.stringifyColAddr(16383)).toBe("XFD");
      expect(ExcelUtils.parseColAddrCode("XFD")).toBe(16383);
    });

    it("A-Z를 0-25로 파싱한다", () => {
      expect(ExcelUtils.parseColAddrCode("A")).toBe(0);
      expect(ExcelUtils.parseColAddrCode("B")).toBe(1);
      expect(ExcelUtils.parseColAddrCode("Z")).toBe(25);
    });

    it("AA, AB 등을 26 이상으로 파싱한다", () => {
      expect(ExcelUtils.parseColAddrCode("AA")).toBe(26);
      expect(ExcelUtils.parseColAddrCode("AB")).toBe(27);
      expect(ExcelUtils.parseColAddrCode("AZ")).toBe(51);
      expect(ExcelUtils.parseColAddrCode("BA")).toBe(52);
    });

    it("셀 주소에서 열 인덱스를 파싱한다", () => {
      expect(ExcelUtils.parseColAddrCode("A1")).toBe(0);
      expect(ExcelUtils.parseColAddrCode("B10")).toBe(1);
      expect(ExcelUtils.parseColAddrCode("AA100")).toBe(26);
    });

    it("라운드트립: stringify → parse가 원래 값을 반환한다", () => {
      for (let i = 0; i < 100; i++) {
        const stringified = ExcelUtils.stringifyColAddr(i);
        const parsed = ExcelUtils.parseColAddrCode(stringified);
        expect(parsed).toBe(i);
      }
    });

    it("음수 열 인덱스 입력 시 에러", () => {
      expect(() => ExcelUtils.stringifyColAddr(-1)).toThrow();
      expect(() => ExcelUtils.stringifyColAddr(-100)).toThrow();
    });
  });

  describe("stringifyRowAddr / parseRowAddrCode", () => {
    it("0-based 인덱스를 1-based 문자열로 변환한다", () => {
      expect(ExcelUtils.stringifyRowAddr(0)).toBe("1");
      expect(ExcelUtils.stringifyRowAddr(9)).toBe("10");
      expect(ExcelUtils.stringifyRowAddr(99)).toBe("100");
    });

    it("1-based 문자열을 0-based 인덱스로 파싱한다", () => {
      expect(ExcelUtils.parseRowAddrCode("A1")).toBe(0);
      expect(ExcelUtils.parseRowAddrCode("B10")).toBe(9);
      expect(ExcelUtils.parseRowAddrCode("AA100")).toBe(99);
    });
  });

  describe("stringifyAddr / parseCellAddrCode", () => {
    it("셀 주소를 올바르게 변환한다", () => {
      expect(ExcelUtils.stringifyAddr({ r: 0, c: 0 })).toBe("A1");
      expect(ExcelUtils.stringifyAddr({ r: 9, c: 1 })).toBe("B10");
      expect(ExcelUtils.stringifyAddr({ r: 99, c: 26 })).toBe("AA100");
    });

    it("셀 주소를 올바르게 파싱한다", () => {
      expect(ExcelUtils.parseCellAddrCode("A1")).toEqual({ r: 0, c: 0 });
      expect(ExcelUtils.parseCellAddrCode("B10")).toEqual({ r: 9, c: 1 });
      expect(ExcelUtils.parseCellAddrCode("AA100")).toEqual({ r: 99, c: 26 });
    });
  });

  describe("parseRangeAddrCode / stringifyRangeAddr", () => {
    it("단일 셀 범위를 파싱한다", () => {
      const range = ExcelUtils.parseRangeAddrCode("A1");
      expect(range.s).toEqual({ r: 0, c: 0 });
      expect(range.e).toEqual({ r: 0, c: 0 });
    });

    it("다중 셀 범위를 파싱한다", () => {
      const range = ExcelUtils.parseRangeAddrCode("A1:C3");
      expect(range.s).toEqual({ r: 0, c: 0 });
      expect(range.e).toEqual({ r: 2, c: 2 });
    });

    it("단일 셀 범위를 문자열로 변환한다", () => {
      const addr = ExcelUtils.stringifyRangeAddr({
        s: { r: 0, c: 0 },
        e: { r: 0, c: 0 },
      });
      expect(addr).toBe("A1");
    });

    it("다중 셀 범위를 문자열로 변환한다", () => {
      const addr = ExcelUtils.stringifyRangeAddr({
        s: { r: 0, c: 0 },
        e: { r: 2, c: 2 },
      });
      expect(addr).toBe("A1:C3");
    });
  });

  describe("convertTimeTickToNumber / convertNumberToTimeTick", () => {
    it("1970-01-01을 올바르게 변환한다", () => {
      const date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
      const tick = date.getTime();
      const excelNum = ExcelUtils.convertTimeTickToNumber(tick);
      // 1970-01-01은 Excel 기준 25569일째
      expect(excelNum).toBeCloseTo(25569, 0);
    });

    it("2024-06-15를 올바르게 변환한다", () => {
      const date = new Date(Date.UTC(2024, 5, 15, 0, 0, 0));
      const tick = date.getTime();
      const excelNum = ExcelUtils.convertTimeTickToNumber(tick);
      // 대략적인 값 확인
      expect(excelNum).toBeGreaterThan(45000);
    });

    it("시간 포함 날짜를 올바르게 변환한다", () => {
      const date = new Date(Date.UTC(2024, 5, 15, 12, 0, 0));
      const tick = date.getTime();
      const excelNum = ExcelUtils.convertTimeTickToNumber(tick);
      // 12시 = 0.5일 추가
      const baseNum = ExcelUtils.convertTimeTickToNumber(
        new Date(Date.UTC(2024, 5, 15, 0, 0, 0)).getTime(),
      );
      expect(excelNum - baseNum).toBeCloseTo(0.5, 1);
    });

    it("라운드트립: tick → number → tick이 원래 값을 반환한다", () => {
      const originalDate = new Date(Date.UTC(2024, 5, 15, 14, 30, 45));
      const tick = originalDate.getTime();
      const excelNum = ExcelUtils.convertTimeTickToNumber(tick);
      const recoveredTick = ExcelUtils.convertNumberToTimeTick(excelNum);
      // 밀리초 단위까지 정확히 일치하지 않을 수 있으므로 초 단위로 비교
      expect(Math.floor(recoveredTick / 1000)).toBe(Math.floor(tick / 1000));
    });
  });

  describe("convertNumFmtCodeToName", () => {
    it("General을 number로 인식한다", () => {
      expect(ExcelUtils.convertNumFmtCodeToName("General")).toBe("number");
    });

    it("날짜 패턴을 DateOnly로 인식한다", () => {
      expect(ExcelUtils.convertNumFmtCodeToName("yyyy-mm-dd")).toBe("DateOnly");
      expect(ExcelUtils.convertNumFmtCodeToName("yy/mm/dd")).toBe("DateOnly");
      expect(ExcelUtils.convertNumFmtCodeToName("dd-mmm-yyyy")).toBe("DateOnly");
    });

    // NOTE: 현재 구현에서 'mm'은 날짜(month)와 시간(minute) 둘 다에서 사용됨
    // 정규식: hasDate = /yy|dd|mm/i, hasTime = /hh|ss/i
    // 따라서 "hh:mm:ss"는 hasDate(mm)=true, hasTime(hh,ss)=true → DateTime
    // "h:mm"은 hasDate(mm)=true, hasTime=false (h는 hh가 아님) → DateOnly
    it("시간 패턴을 처리한다 (mm 모호성 주의)", () => {
      // "hh:mm:ss": hasDate(mm)=true, hasTime(hh,ss)=true → DateTime
      expect(ExcelUtils.convertNumFmtCodeToName("hh:mm:ss")).toBe("DateTime");
      // "h:mm": hasDate(mm)=true, hasTime=false (h≠hh) → DateOnly
      expect(ExcelUtils.convertNumFmtCodeToName("h:mm")).toBe("DateOnly");
      // 순수 시간 포맷 (ss만 있고 mm 없는 경우)
      expect(ExcelUtils.convertNumFmtCodeToName("[h]:ss")).toBe("Time");
    });

    it("날짜+시간 패턴을 DateTime으로 인식한다", () => {
      expect(ExcelUtils.convertNumFmtCodeToName("yyyy-mm-dd hh:mm:ss")).toBe("DateTime");
      // "yy/mm/dd h:mm"는 날짜만 감지됨 (h:mm에서 hh가 아니고 ss도 없으므로)
      expect(ExcelUtils.convertNumFmtCodeToName("yy/mm/dd h:mm")).toBe("DateOnly");
      // 명확한 DateTime 패턴
      expect(ExcelUtils.convertNumFmtCodeToName("yyyy/mm/dd hh:mm:ss")).toBe("DateTime");
    });

    it("숫자 패턴을 number로 인식한다", () => {
      expect(ExcelUtils.convertNumFmtCodeToName("#,##0")).toBe("number");
      expect(ExcelUtils.convertNumFmtCodeToName("0.00")).toBe("number");
      expect(ExcelUtils.convertNumFmtCodeToName("#,0")).toBe("number");
    });

    it("알 수 없는 포맷 코드 입력 시 에러", () => {
      expect(() => ExcelUtils.convertNumFmtCodeToName("unknown-format-xyz")).toThrow();
    });
  });

  describe("convertNumFmtIdToName", () => {
    it("일반적인 숫자 포맷을 인식한다", () => {
      expect(ExcelUtils.convertNumFmtIdToName(0)).toBe("number");
      expect(ExcelUtils.convertNumFmtIdToName(1)).toBe("number");
      expect(ExcelUtils.convertNumFmtIdToName(2)).toBe("number");
    });

    it("날짜 포맷을 인식한다", () => {
      expect(ExcelUtils.convertNumFmtIdToName(14)).toBe("DateOnly");
      expect(ExcelUtils.convertNumFmtIdToName(15)).toBe("DateOnly");
    });

    it("날짜+시간 포맷을 인식한다", () => {
      expect(ExcelUtils.convertNumFmtIdToName(22)).toBe("DateTime");
    });

    it("시간 포맷을 인식한다", () => {
      expect(ExcelUtils.convertNumFmtIdToName(18)).toBe("Time");
      expect(ExcelUtils.convertNumFmtIdToName(19)).toBe("Time");
    });

    it("텍스트 포맷을 인식한다", () => {
      expect(ExcelUtils.convertNumFmtIdToName(49)).toBe("string");
    });

    it("알 수 없는 numFmtId 입력 시 에러", () => {
      expect(() => ExcelUtils.convertNumFmtIdToName(23)).toThrow();
      expect(() => ExcelUtils.convertNumFmtIdToName(100)).toThrow();
    });
  });

  describe("convertNumFmtNameToId", () => {
    it("포맷 이름을 ID로 변환한다", () => {
      expect(ExcelUtils.convertNumFmtNameToId("number")).toBe(0);
      expect(ExcelUtils.convertNumFmtNameToId("DateOnly")).toBe(14);
      expect(ExcelUtils.convertNumFmtNameToId("DateTime")).toBe(22);
      expect(ExcelUtils.convertNumFmtNameToId("Time")).toBe(18);
      expect(ExcelUtils.convertNumFmtNameToId("string")).toBe(49);
    });
  });
});
