import { describe, expect, it } from "vitest";
import { ExcelXmlSharedString } from "../../src/xml/excel-xml-shared-string";
import type { ExcelXmlSharedStringData } from "../../src/types";

describe("ExcelXmlSharedString", () => {
  describe("빈 텍스트 요소 처리 (LOGIC-001)", () => {
    it("preserve 속성이 있고 텍스트가 있는 요소는 텍스트를 반환한다", () => {
      const data: ExcelXmlSharedStringData = {
        sst: {
          $: { xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main" },
          si: [{ t: [{ $: { space: "preserve" }, _: " " }] }],
        },
      };
      const ss = new ExcelXmlSharedString(data);
      expect(ss.getStringById(0)).toBe(" ");
    });

    it("preserve 속성이 있고 텍스트가 없는 빈 요소는 빈 문자열을 반환한다", () => {
      const data: ExcelXmlSharedStringData = {
        sst: {
          $: { xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main" },
          si: [{ t: [{ $: { space: "preserve" } }] }],
        },
      };
      const ss = new ExcelXmlSharedString(data);
      expect(ss.getStringById(0)).toBe("");
    });

    it("일반 텍스트 요소는 텍스트를 반환한다", () => {
      const data: ExcelXmlSharedStringData = {
        sst: {
          $: { xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main" },
          si: [{ t: ["text"] }],
        },
      };
      const ss = new ExcelXmlSharedString(data);
      expect(ss.getStringById(0)).toBe("text");
    });
  });
});
