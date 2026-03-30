import { describe, expect, it } from "vitest";
import { ExcelXmlRelationship } from "../../src/xml/excel-xml-relationship";

describe("ExcelXmlRelationship", () => {
  describe("rId 파싱 (CONSIST-001)", () => {
    it("rId1을 1로 파싱한다", () => {
      const rel = new ExcelXmlRelationship({
        Relationships: {
          $: { xmlns: "http://schemas.openxmlformats.org/package/2006/relationships" },
          Relationship: [
            { $: { Id: "rId1", Target: "target1.xml", Type: "http://example.com/type" } },
          ],
        },
      });
      expect(rel.getTargetByRelId(1)).toBe("target1.xml");
    });

    it("rId123을 123으로 파싱한다", () => {
      const rel = new ExcelXmlRelationship({
        Relationships: {
          $: { xmlns: "http://schemas.openxmlformats.org/package/2006/relationships" },
          Relationship: [
            { $: { Id: "rId123", Target: "target123.xml", Type: "http://example.com/type" } },
          ],
        },
      });
      expect(rel.getTargetByRelId(123)).toBe("target123.xml");
    });

    it("add로 추가된 rId를 올바르게 파싱한다", () => {
      const rel = new ExcelXmlRelationship();
      rel.add("first.xml", "http://example.com/type1");
      rel.add("second.xml", "http://example.com/type2");

      expect(rel.getTargetByRelId(1)).toBe("first.xml");
      expect(rel.getTargetByRelId(2)).toBe("second.xml");
    });
  });
});
