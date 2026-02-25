import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";

describe("ExcelCell", () => {
  describe("Cell Value Read/Write - Basic Types", () => {
    it("Can read and write string values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Hello World");
      const val = await ws.cell(0, 0).getVal();

      expect(val).toBe("Hello World");
    });

    it("Can read and write number values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(12345);
      await ws.cell(0, 1).setVal(3.14159);
      await ws.cell(0, 2).setVal(-100);
      await ws.cell(0, 3).setVal(0);

      expect(await ws.cell(0, 0).getVal()).toBe(12345);
      expect(await ws.cell(0, 1).getVal()).toBe(3.14159);
      expect(await ws.cell(0, 2).getVal()).toBe(-100);
      expect(await ws.cell(0, 3).getVal()).toBe(0);
    });

    it("Can read and write boolean values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(true);
      await ws.cell(0, 1).setVal(false);

      expect(await ws.cell(0, 0).getVal()).toBe(true);
      expect(await ws.cell(0, 1).getVal()).toBe(false);
    });

    it("Setting undefined value deletes the cell", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Initial");
      expect(await ws.cell(0, 0).getVal()).toBe("Initial");

      await ws.cell(0, 0).setVal(undefined);
      expect(await ws.cell(0, 0).getVal()).toBeUndefined();
    });

    it("Can handle very large numbers", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // Large number below MAX_SAFE_INTEGER
      const bigNumber = Number.MAX_SAFE_INTEGER;
      await ws.cell(0, 0).setVal(bigNumber);

      const val = await ws.cell(0, 0).getVal();
      expect(val).toBe(bigNumber);
    });

    it("Can handle very small decimals", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // Small decimal within Excel's precision range
      const smallDecimal = 0.0001;
      await ws.cell(0, 0).setVal(smallDecimal);

      const val = await ws.cell(0, 0).getVal();
      expect(val).toBeCloseTo(smallDecimal, 6);
    });

    it("Throws error when setting unsupported type", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await expect(ws.cell(0, 0).setVal({} as any)).rejects.toThrow("지원되지 않는 타입");

      await expect(ws.cell(0, 1).setVal([] as any)).rejects.toThrow("지원되지 않는 타입");
    });
  });

  describe("Cell Value Read/Write - Date/Time Types", () => {
    it("Can read and write DateOnly values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const date = new DateOnly(2024, 6, 15);
      await ws.cell(0, 0).setVal(date);

      const val = await ws.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(DateOnly);
      expect((val as DateOnly).year).toBe(2024);
      expect((val as DateOnly).month).toBe(6);
      expect((val as DateOnly).day).toBe(15);
    });

    it("Can read and write DateTime values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const dateTime = new DateTime(2024, 6, 15, 14, 30, 45);
      await ws.cell(0, 0).setVal(dateTime);

      const val = await ws.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(DateTime);
      expect((val as DateTime).year).toBe(2024);
      expect((val as DateTime).month).toBe(6);
      expect((val as DateTime).day).toBe(15);
      expect((val as DateTime).hour).toBe(14);
      expect((val as DateTime).minute).toBe(30);
      expect((val as DateTime).second).toBe(45);
    });

    it("Can read and write Time values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const time = new Time(14, 30, 45);
      await ws.cell(0, 0).setVal(time);

      const val = await ws.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(Time);
      expect((val as Time).hour).toBe(14);
      expect((val as Time).minute).toBe(30);
      expect((val as Time).second).toBe(45);
    });

    it("DateOnly values persist after round-trip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const date = new DateOnly(2024, 6, 15);
      await ws.cell(0, 0).setVal(date);

      const bytes = await wb.getBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(DateOnly);
      expect((val as DateOnly).year).toBe(2024);
      expect((val as DateOnly).month).toBe(6);
      expect((val as DateOnly).day).toBe(15);
      await wb2.close();
    });

    it("DateTime values persist after round-trip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const dateTime = new DateTime(2024, 6, 15, 14, 30, 45);
      await ws.cell(0, 0).setVal(dateTime);

      const bytes = await wb.getBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(DateTime);
      expect((val as DateTime).year).toBe(2024);
      expect((val as DateTime).month).toBe(6);
      expect((val as DateTime).day).toBe(15);
      expect((val as DateTime).hour).toBe(14);
      expect((val as DateTime).minute).toBe(30);
      expect((val as DateTime).second).toBe(45);
      await wb2.close();
    });

    it("Time values persist after round-trip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const time = new Time(14, 30, 45);
      await ws.cell(0, 0).setVal(time);

      const bytes = await wb.getBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(Time);
      expect((val as Time).hour).toBe(14);
      expect((val as Time).minute).toBe(30);
      expect((val as Time).second).toBe(45);
      await wb2.close();
    });
  });

  describe("Formulas", () => {
    it("Can set formulas", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(10);
      await ws.cell(0, 1).setVal(20);
      await ws.cell(0, 2).setFormula("A1+B1");

      // Verify formula directly
      const formula = await ws.cell(0, 2).getFormula();
      expect(formula).toBe("A1+B1");

      // Also verify with round-trip
      const buffer = await wb.getBytes();

      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);
      // Formula exists but value must be calculated by Excel
      expect(ws2).toBeDefined();
    });

    it("Formulas persist after round-trip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(10);
      await ws.cell(0, 1).setVal(20);
      await ws.cell(0, 2).setFormula("SUM(A1:B1)");

      const buffer = await wb.getBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);

      // Verify that formula string is saved
      const formula = await ws2.cell(0, 2).getFormula();
      expect(formula).toBe("SUM(A1:B1)");
      await wb2.close();
    });

    it("Setting formula to undefined deletes it", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setFormula("A1+B1");
      await ws.cell(0, 0).setFormula(undefined);

      expect(await ws.cell(0, 0).getVal()).toBeUndefined();
    });
  });

  describe("Cell Merge", () => {
    it("Can merge cells", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Merged");
      await ws.cell(0, 0).merge(2, 3); // Merge 2 rows x 3 columns

      // Verify merge with round-trip
      const buffer = await wb.getBytes();
      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getVal();
      expect(val).toBe("Merged");
    });

    it("Throws error when attempting to merge overlapping ranges", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).merge(2, 2); // Merge A1:B2

      // Attempt to merge overlapping range (B2:C3)
      await expect(ws.cell(1, 1).merge(2, 2)).rejects.toThrow("병합 셀이 기존 병합 범위");
    });
  });

  describe("Cell Style", () => {
    it("Can set background color", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Colored");
      await ws.cell(0, 0).setStyle({ background: "00FF0000" }); // Red

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("Can set borders", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Bordered");
      await ws.cell(0, 0).setStyle({ border: ["left", "right", "top", "bottom"] });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("Can set alignment", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Aligned");
      await ws.cell(0, 0).setStyle({
        horizontalAlign: "center",
        verticalAlign: "center",
      });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("Can set number format", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(12345.6789);
      await ws.cell(0, 0).setStyle({ numberFormat: "number" });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("Can set multiple styles simultaneously", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Multi-Style");
      await ws.cell(0, 0).setStyle({
        background: "00FFFF00",
        border: ["left", "right"],
        horizontalAlign: "center",
        verticalAlign: "top",
      });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("Throws error for invalid color format", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Test");
      await expect(ws.cell(0, 0).setStyle({ background: "invalid" })).rejects.toThrow();
    });

    it("Styles persist after round-trip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // Set various styles
      await ws.cell(0, 0).setVal("Styled");
      await ws.cell(0, 0).setStyle({
        background: "00FF0000", // Red
        border: ["left", "right", "top", "bottom"],
        horizontalAlign: "center",
        verticalAlign: "top",
      });

      const bytes = await wb.getBytes();

      // Verify styles after round-trip
      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet("Test");

      // Verify value
      const val = await ws2.cell(0, 0).getVal();
      expect(val).toBe("Styled");

      // Verify style ID exists
      const styleId = await ws2.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();

      // Verify style data at XML level
      const styleData = await (wb2 as any).zipCache.get("xl/styles.xml");
      const styleIdNum = parseInt(styleId!, 10);
      const xf = styleData.data.styleSheet.cellXfs[0].xf[styleIdNum];

      // Verify background color
      expect(xf.$.fillId).toBeDefined();
      const fillId = parseInt(xf.$.fillId, 10);
      const fill = styleData.data.styleSheet.fills[0].fill[fillId];
      expect(fill.patternFill[0].fgColor[0].$.rgb).toBe("00FF0000");

      // Verify borders
      expect(xf.$.borderId).toBeDefined();
      const borderId = parseInt(xf.$.borderId, 10);
      const border = styleData.data.styleSheet.borders[0].border[borderId];
      expect(border.left).toBeDefined();
      expect(border.right).toBeDefined();
      expect(border.top).toBeDefined();
      expect(border.bottom).toBeDefined();

      // Verify alignment
      expect(xf.alignment).toBeDefined();
      expect(xf.alignment[0].$.horizontal).toBe("center");
      expect(xf.alignment[0].$.vertical).toBe("top");
    });
  });
});
