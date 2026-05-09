import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";
import type {
  ExcelXmlConditionalFormattingData,
  ExcelXmlStyleData,
  ExcelXmlWorksheetData,
} from "../src/types";

async function getCfBlocks(
  wb: ExcelWorkbook,
  sheetFile = "xl/worksheets/sheet1.xml",
): Promise<ExcelXmlConditionalFormattingData[]> {
  const ws = (await (wb as any).zipCache.get(sheetFile)) as { data: ExcelXmlWorksheetData };
  return ws.data.worksheet.conditionalFormatting ?? [];
}

async function getDxfs(
  wb: ExcelWorkbook,
): Promise<NonNullable<ExcelXmlStyleData["styleSheet"]["dxfs"]>[number]["dxf"]> {
  const styleData = (await (wb as any).zipCache.get("xl/styles.xml")) as {
    data: ExcelXmlStyleData;
  };
  return styleData.data.styleSheet.dxfs?.[0].dxf ?? [];
}

describe("ExcelWorksheet.addConditionalFormat", () => {
  describe("Story 1 — 단일 비교 연산자", () => {
    it.each([
      ["<", "lessThan"],
      [">", "greaterThan"],
      ["<=", "lessThanOrEqual"],
      [">=", "greaterThanOrEqual"],
      ["=", "equal"],
      ["<>", "notEqual"],
    ] as const)("op %s 가 OOXML operator %s 로 매핑된다", async (op, expectedOp) => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1:B10",
        rules: [
          {
            type: "cellIs",
            op,
            value: 4999,
            style: { background: "00FFFF00" },
          },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].$.sqref).toBe("A1:B10");
      expect(blocks[0].cfRule).toHaveLength(1);
      expect(blocks[0].cfRule[0].$.operator).toBe(expectedOp);
      expect(blocks[0].cfRule[0].$.priority).toBe("1");
      expect(blocks[0].cfRule[0].formula).toEqual(["4999"]);
    });

    it("number value 는 raw formula 로 emit", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          {
            type: "cellIs",
            op: "<",
            value: 4999,
            style: { background: "00FFFF00" },
          },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].formula).toEqual(["4999"]);
    });

    it("string value 는 큰따옴표 둘러싼 리터럴 formula 로 emit", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          {
            type: "cellIs",
            op: "=",
            value: "OK",
            style: { background: "0000FF00" },
          },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].formula).toEqual(['"OK"']);
    });

    it("string value 내 큰따옴표는 OOXML escape 규칙대로 두 배로", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          {
            type: "cellIs",
            op: "=",
            value: 'a"b',
            style: { background: "00FFFFFF" },
          },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].formula).toEqual(['"a""b"']);
    });

    it("dxf 가 styles.xml 에 등록되고 dxfId 가 cfRule 에 연결된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          {
            type: "cellIs",
            op: "<",
            value: 100,
            style: { background: "00FF0000", fontColor: "00FFFFFF", fontWeight: "bold" },
          },
        ],
      });

      const dxfs = await getDxfs(wb);
      const blocks = await getCfBlocks(wb);
      const dxfId = parseInt(blocks[0].cfRule[0].$.dxfId, 10);
      const dxf = dxfs[dxfId];

      expect(dxf.fill?.[0].patternFill[0].bgColor?.[0].$.rgb).toBe("00FF0000");
      expect(dxf.font?.[0].color?.[0].$.rgb).toBe("00FFFFFF");
      expect(dxf.font?.[0].b?.[0].$.val).toBe("1");
    });

    it("fontWeight: 'normal' 은 b val='0' 으로 emit", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          {
            type: "cellIs",
            op: "=",
            value: 0,
            style: { fontWeight: "normal" },
          },
        ],
      });

      const dxfs = await getDxfs(wb);
      expect(dxfs[0].font?.[0].b?.[0].$.val).toBe("0");
    });
  });

  describe("Story 2 — between / notBetween", () => {
    it("between number 튜플 → formula 두 개를 순서대로", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "B2:B100",
        rules: [
          {
            type: "cellIs",
            op: "between",
            value: [1000, 2000],
            style: { background: "0000FFFF" },
          },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].$.operator).toBe("between");
      expect(blocks[0].cfRule[0].formula).toEqual(["1000", "2000"]);
    });

    it("notBetween string 튜플 → 큰따옴표 둘러싼 두 formula", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "C1:C5",
        rules: [
          {
            type: "cellIs",
            op: "notBetween",
            value: ["A", "M"],
            style: { background: "00FF00FF" },
          },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].$.operator).toBe("notBetween");
      expect(blocks[0].cfRule[0].formula).toEqual(['"A"', '"M"']);
    });
  });

  describe("Story 3 — 다중 규칙 priority", () => {
    it("rules 배열 순서대로 priority 1, 2, 3 부여", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1:A10",
        rules: [
          { type: "cellIs", op: "<", value: 1000, style: { background: "00FF0000" } },
          { type: "cellIs", op: "<", value: 4999, style: { background: "00FFFF00" } },
          { type: "cellIs", op: ">=", value: 5000, style: { background: "0000FF00" } },
        ],
      });

      const blocks = await getCfBlocks(wb);
      const priorities = blocks[0].cfRule.map((r) => r.$.priority);
      expect(priorities).toEqual(["1", "2", "3"]);
    });

    it("같은 style 의 규칙은 dxf 가 dedupe 되어 1개로 등록", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          { type: "cellIs", op: "<", value: 100, style: { background: "00FFFF00" } },
          { type: "cellIs", op: ">", value: 200, style: { background: "00FFFF00" } },
        ],
      });

      const dxfs = await getDxfs(wb);
      expect(dxfs).toHaveLength(1);
    });
  });

  describe("호출 간 누적 / 시트 전역 priority 카운터", () => {
    it("addConditionalFormat 두 번 호출 → 블록 두 개 누적", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [{ type: "cellIs", op: "<", value: 100, style: { background: "00FF0000" } }],
      });
      await ws.addConditionalFormat({
        ref: "B1:B5",
        rules: [{ type: "cellIs", op: ">", value: 200, style: { background: "0000FF00" } }],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].$.sqref).toBe("A1");
      expect(blocks[1].$.sqref).toBe("B1:B5");
    });

    it("priority 는 시트 전역에서 이어붙음 (1, 2, 3, 4)", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          { type: "cellIs", op: "<", value: 100, style: { background: "00FF0000" } },
          { type: "cellIs", op: ">", value: 200, style: { background: "0000FF00" } },
        ],
      });
      await ws.addConditionalFormat({
        ref: "B1",
        rules: [
          { type: "cellIs", op: "=", value: 0, style: { background: "00FFFF00" } },
          { type: "cellIs", op: "<>", value: 0, style: { background: "00FF00FF" } },
        ],
      });

      const blocks = await getCfBlocks(wb);
      const priorities = blocks.flatMap((b) => b.cfRule.map((r) => r.$.priority));
      expect(priorities).toEqual(["1", "2", "3", "4"]);
    });
  });

  describe("텍스트 매칭 (TASK-002)", () => {
    it.each([
      ["contains", "containsText", "containsText"],
      ["notContains", "notContainsText", "notContains"],
      ["beginsWith", "beginsWith", "beginsWith"],
      ["endsWith", "endsWith", "endsWith"],
    ] as const)(
      "op %s 가 cfRule type=%s / operator=%s 로 매핑된다",
      async (op, expectedType, expectedOperator) => {
        const wb = new ExcelWorkbook();
        const ws = await wb.addWorksheet("Test");

        await ws.addConditionalFormat({
          ref: "A2:A100",
          rules: [
            {
              type: "text",
              op,
              value: "긴급",
              style: { background: "00FFCCCC" },
            },
          ],
        });

        const blocks = await getCfBlocks(wb);
        expect(blocks[0].cfRule[0].$.type).toBe(expectedType);
        expect(blocks[0].cfRule[0].$.operator).toBe(expectedOperator);
        expect(blocks[0].cfRule[0].$.text).toBe("긴급");
      },
    );

    it("contains formula = NOT(ISERROR(SEARCH(\"v\",topLeft)))", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A2:A100",
        rules: [
          { type: "text", op: "contains", value: "OK", style: { background: "0000FF00" } },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].formula).toEqual([
        'NOT(ISERROR(SEARCH("OK",A2)))',
      ]);
    });

    it("notContains formula = ISERROR(SEARCH(\"v\",topLeft))", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "B5:B10",
        rules: [
          { type: "text", op: "notContains", value: "OK", style: { fontColor: "00FF0000" } },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].formula).toEqual(['ISERROR(SEARCH("OK",B5))']);
    });

    it("beginsWith formula = LEFT(topLeft,LEN(\"v\"))=\"v\"", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "C1:C20",
        rules: [
          { type: "text", op: "beginsWith", value: "P-", style: { background: "00FFFF00" } },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].formula).toEqual(['LEFT(C1,LEN("P-"))="P-"']);
    });

    it("endsWith formula = RIGHT(topLeft,LEN(\"v\"))=\"v\"", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "D3",
        rules: [
          { type: "text", op: "endsWith", value: ".pdf", style: { background: "00CCCCCC" } },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].formula).toEqual(['RIGHT(D3,LEN(".pdf"))=".pdf"']);
    });

    it("topLeft 추출 — 단일 셀이면 ref 그대로", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "Z99",
        rules: [{ type: "text", op: "contains", value: "x", style: { background: "00FFFFFF" } }],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].formula[0]).toContain(",Z99)");
    });

    it("value 내 큰따옴표는 OOXML escape 규칙대로 두 배", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          { type: "text", op: "contains", value: 'a"b', style: { background: "00FFFFFF" } },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].$.text).toBe('a"b');
      expect(blocks[0].cfRule[0].formula).toEqual([
        'NOT(ISERROR(SEARCH("a""b",A1)))',
      ]);
    });

    it("text rule 의 style 이 dxf 에 등록되고 dxfId 가 cfRule 에 연결된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          {
            type: "text",
            op: "contains",
            value: "긴급",
            style: { background: "00FFCCCC", fontColor: "00FF0000", fontWeight: "bold" },
          },
        ],
      });

      const dxfs = await getDxfs(wb);
      const blocks = await getCfBlocks(wb);
      const dxfId = parseInt(blocks[0].cfRule[0].$.dxfId, 10);
      const dxf = dxfs[dxfId];
      expect(dxf.fill?.[0].patternFill[0].bgColor?.[0].$.rgb).toBe("00FFCCCC");
      expect(dxf.font?.[0].color?.[0].$.rgb).toBe("00FF0000");
      expect(dxf.font?.[0].b?.[0].$.val).toBe("1");
    });

    it("같은 style 의 text rule 은 dxf dedupe", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          { type: "text", op: "contains", value: "X", style: { background: "00FFCCCC" } },
          { type: "text", op: "endsWith", value: "Y", style: { background: "00FFCCCC" } },
        ],
      });

      const dxfs = await getDxfs(wb);
      expect(dxfs).toHaveLength(1);
    });

    it("cellIs 와 text 를 같은 시트에 섞어 호출 시 priority 가 시트 전역 카운터로 이어진다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1:A10",
        rules: [
          { type: "cellIs", op: "<", value: 100, style: { background: "00FF0000" } },
        ],
      });
      await ws.addConditionalFormat({
        ref: "B1:B10",
        rules: [
          { type: "text", op: "contains", value: "긴급", style: { background: "00FFCCCC" } },
          { type: "text", op: "endsWith", value: ".pdf", style: { background: "00CCFFCC" } },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks).toHaveLength(2);
      const priorities = blocks.flatMap((b) => b.cfRule.map((r) => r.$.priority));
      expect(priorities).toEqual(["1", "2", "3"]);
    });
  });

  describe("임의 expression (TASK-003)", () => {
    it("type=expression 으로 emit, operator 미부여, formula raw 그대로 1개", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const formula = 'AND($F2<>"",$F2-TODAY()<=7)';
      await ws.addConditionalFormat({
        ref: "F2:F500",
        rules: [
          {
            type: "expression",
            formula,
            style: { background: "00FFCCCC", fontWeight: "bold" },
          },
        ],
      });

      const blocks = await getCfBlocks(wb);
      expect(blocks[0].cfRule[0].$.type).toBe("expression");
      expect(blocks[0].cfRule[0].$.operator).toBeUndefined();
      expect(blocks[0].cfRule[0].$.text).toBeUndefined();
      expect(blocks[0].cfRule[0].formula).toEqual([formula]);
    });

    it("expression style 이 dxf 에 등록되고 dxfId 가 cfRule 에 연결된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          {
            type: "expression",
            formula: "A1>10",
            style: { background: "0000FFFF", fontColor: "00FFFFFF" },
          },
        ],
      });

      const dxfs = await getDxfs(wb);
      const blocks = await getCfBlocks(wb);
      const dxfId = parseInt(blocks[0].cfRule[0].$.dxfId, 10);
      expect(dxfs[dxfId].fill?.[0].patternFill[0].bgColor?.[0].$.rgb).toBe("0000FFFF");
      expect(dxfs[dxfId].font?.[0].color?.[0].$.rgb).toBe("00FFFFFF");
    });

    it("같은 style 의 expression rule 은 dxf dedupe", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1:A10",
        rules: [
          {
            type: "expression",
            formula: "A1>10",
            style: { background: "00FFFF00" },
          },
          {
            type: "expression",
            formula: "EXACT(A1,\"foo\")",
            style: { background: "00FFFF00" },
          },
        ],
      });

      const dxfs = await getDxfs(wb);
      expect(dxfs).toHaveLength(1);
    });

    it("cellIs / text / expression 혼용 시 priority 가 시트 전역으로 이어진다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1",
        rules: [
          { type: "cellIs", op: "<", value: 100, style: { background: "00FF0000" } },
        ],
      });
      await ws.addConditionalFormat({
        ref: "B1",
        rules: [
          { type: "text", op: "contains", value: "긴급", style: { background: "00FFCCCC" } },
        ],
      });
      await ws.addConditionalFormat({
        ref: "C1",
        rules: [
          { type: "expression", formula: "C1>10", style: { background: "0000FFFF" } },
        ],
      });

      const blocks = await getCfBlocks(wb);
      const priorities = blocks.flatMap((b) => b.cfRule.map((r) => r.$.priority));
      expect(priorities).toEqual(["1", "2", "3"]);
      expect(blocks[0].cfRule[0].$.type).toBe("cellIs");
      expect(blocks[1].cfRule[0].$.type).toBe("containsText");
      expect(blocks[2].cfRule[0].$.type).toBe("expression");
    });
  });

  describe("Roundtrip", () => {
    it("expression rule roundtrip — formula 메타 문자(<,>,\")가 그대로 보존", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const formula = 'AND($F2<>"",$F2-TODAY()<=7)';
      await ws.addConditionalFormat({
        ref: "F2:F500",
        rules: [
          {
            type: "expression",
            formula,
            style: { background: "00FFCCCC", fontWeight: "bold" },
          },
        ],
      });

      const bytes = await wb.toBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      try {
        const blocks = await getCfBlocks(wb2);
        expect(blocks[0].cfRule[0].$.type).toBe("expression");
        expect(blocks[0].cfRule[0].$.operator).toBeUndefined();
        expect(blocks[0].cfRule[0].formula).toEqual([formula]);

        const dxfs = await getDxfs(wb2);
        const dxfId = parseInt(blocks[0].cfRule[0].$.dxfId, 10);
        expect(dxfs[dxfId].fill?.[0].patternFill[0].bgColor?.[0].$.rgb).toBe("00FFCCCC");
        expect(dxfs[dxfId].font?.[0].b?.[0].$.val).toBe("1");
      } finally {
        await wb2.close();
      }
    });

    it("text rule roundtrip — type/operator/text/formula/dxf 모두 보존", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A2:A100",
        rules: [
          {
            type: "text",
            op: "contains",
            value: "긴급",
            style: { background: "00FFCCCC", fontWeight: "bold" },
          },
        ],
      });

      const bytes = await wb.toBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      try {
        const blocks = await getCfBlocks(wb2);
        expect(blocks[0].cfRule[0].$.type).toBe("containsText");
        expect(blocks[0].cfRule[0].$.operator).toBe("containsText");
        expect(blocks[0].cfRule[0].$.text).toBe("긴급");
        expect(blocks[0].cfRule[0].formula).toEqual([
          'NOT(ISERROR(SEARCH("긴급",A2)))',
        ]);

        const dxfs = await getDxfs(wb2);
        const dxfId = parseInt(blocks[0].cfRule[0].$.dxfId, 10);
        expect(dxfs[dxfId].fill?.[0].patternFill[0].bgColor?.[0].$.rgb).toBe("00FFCCCC");
        expect(dxfs[dxfId].font?.[0].b?.[0].$.val).toBe("1");
      } finally {
        await wb2.close();
      }
    });

    it("toBytes 후 다시 열어도 cfRule 과 dxf 가 보존된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.addConditionalFormat({
        ref: "A1:B10",
        rules: [
          {
            type: "cellIs",
            op: "between",
            value: [1, 100],
            style: { background: "00FFFF00", fontColor: "00FF0000", fontWeight: "bold" },
          },
        ],
      });

      const bytes = await wb.toBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      try {
        const blocks = await getCfBlocks(wb2);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].$.sqref).toBe("A1:B10");
        expect(blocks[0].cfRule[0].$.operator).toBe("between");
        expect(blocks[0].cfRule[0].formula).toEqual(["1", "100"]);

        const dxfs = await getDxfs(wb2);
        const dxfId = parseInt(blocks[0].cfRule[0].$.dxfId, 10);
        expect(dxfs[dxfId].fill?.[0].patternFill[0].bgColor?.[0].$.rgb).toBe("00FFFF00");
        expect(dxfs[dxfId].font?.[0].color?.[0].$.rgb).toBe("00FF0000");
        expect(dxfs[dxfId].font?.[0].b?.[0].$.val).toBe("1");
      } finally {
        await wb2.close();
      }
    });
  });
});
