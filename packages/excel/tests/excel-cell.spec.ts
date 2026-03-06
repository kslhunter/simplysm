import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";
import { ExcelXmlWorksheet } from "../src/xml/excel-xml-worksheet";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";
import type { ExcelCellData, ExcelCellType } from "../src";

describe("ExcelXmlWorksheet.getCellVal - inline string", () => {
  it("should read plain string inline text (no attributes)", () => {
    const ws = new ExcelXmlWorksheet({
      worksheet: {
        $: { xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main" },
        sheetData: [{
          row: [{
            $: { r: "1" },
            c: [{
              $: { r: "A1", t: "inlineStr" },
              is: [{ t: ["ID"] }],
            }],
          }],
        }],
      },
    });

    expect(ws.getCellVal({ r: 0, c: 0 })).toBe("ID");
  });

  it("should read object-form inline text (with attributes)", () => {
    const ws = new ExcelXmlWorksheet({
      worksheet: {
        $: { xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main" },
        sheetData: [{
          row: [{
            $: { r: "1" },
            c: [{
              $: { r: "A1", t: "inlineStr" },
              is: [{ t: [{ _: "Hello" }] }],
            }],
          }],
        }],
      },
    });

    expect(ws.getCellVal({ r: 0, c: 0 })).toBe("Hello");
  });
});

describe("ExcelCell", () => {
  describe("Cell Value Read/Write - Basic Types", () => {
    it("Can read and write string values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Hello World");
      const val = await ws.cell(0, 0).getValue();

      expect(val).toBe("Hello World");
    });

    it("Can read and write number values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(12345);
      await ws.cell(0, 1).setValue(3.14159);
      await ws.cell(0, 2).setValue(-100);
      await ws.cell(0, 3).setValue(0);

      expect(await ws.cell(0, 0).getValue()).toBe(12345);
      expect(await ws.cell(0, 1).getValue()).toBe(3.14159);
      expect(await ws.cell(0, 2).getValue()).toBe(-100);
      expect(await ws.cell(0, 3).getValue()).toBe(0);
    });

    it("Can read and write boolean values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(true);
      await ws.cell(0, 1).setValue(false);

      expect(await ws.cell(0, 0).getValue()).toBe(true);
      expect(await ws.cell(0, 1).getValue()).toBe(false);
    });

    it("Setting undefined value deletes the cell", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Initial");
      expect(await ws.cell(0, 0).getValue()).toBe("Initial");

      await ws.cell(0, 0).setValue(undefined);
      expect(await ws.cell(0, 0).getValue()).toBeUndefined();
    });

    it("Throws error when setting unsupported type", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await expect(ws.cell(0, 0).setValue({} as any)).rejects.toThrow("Unsupported type");

      await expect(ws.cell(0, 1).setValue([] as any)).rejects.toThrow("Unsupported type");
    });
  });

  describe("Cell Value Read/Write - Date/Time Types", () => {
    it("Can read and write DateOnly values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const date = new DateOnly(2024, 6, 15);
      await ws.cell(0, 0).setValue(date);

      const val = await ws.cell(0, 0).getValue();
      expect(val).toBeInstanceOf(DateOnly);
      expect((val as DateOnly).year).toBe(2024);
      expect((val as DateOnly).month).toBe(6);
      expect((val as DateOnly).day).toBe(15);
    });

    it("Can read and write DateTime values", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const dateTime = new DateTime(2024, 6, 15, 14, 30, 45);
      await ws.cell(0, 0).setValue(dateTime);

      const val = await ws.cell(0, 0).getValue();
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
      const ws = await wb.addWorksheet("Test");

      const time = new Time(14, 30, 45);
      await ws.cell(0, 0).setValue(time);

      const val = await ws.cell(0, 0).getValue();
      expect(val).toBeInstanceOf(Time);
      expect((val as Time).hour).toBe(14);
      expect((val as Time).minute).toBe(30);
      expect((val as Time).second).toBe(45);
    });

    it("DateOnly values persist after round-trip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const date = new DateOnly(2024, 6, 15);
      await ws.cell(0, 0).setValue(date);

      const bytes = await wb.toBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getValue();
      expect(val).toBeInstanceOf(DateOnly);
      expect((val as DateOnly).year).toBe(2024);
      expect((val as DateOnly).month).toBe(6);
      expect((val as DateOnly).day).toBe(15);
      await wb2.close();
    });

    it("DateTime values persist after round-trip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const dateTime = new DateTime(2024, 6, 15, 14, 30, 45);
      await ws.cell(0, 0).setValue(dateTime);

      const bytes = await wb.toBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getValue();
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
      const ws = await wb.addWorksheet("Test");

      const time = new Time(14, 30, 45);
      await ws.cell(0, 0).setValue(time);

      const bytes = await wb.toBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getValue();
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
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(10);
      await ws.cell(0, 1).setValue(20);
      await ws.cell(0, 2).setFormula("A1+B1");

      // Verify formula directly
      const formula = await ws.cell(0, 2).getFormula();
      expect(formula).toBe("A1+B1");

      // Also verify with round-trip
      const buffer = await wb.toBytes();

      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);
      // Formula exists but value must be calculated by Excel
      expect(ws2).toBeDefined();
    });

    it("Formulas persist after round-trip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(10);
      await ws.cell(0, 1).setValue(20);
      await ws.cell(0, 2).setFormula("SUM(A1:B1)");

      const buffer = await wb.toBytes();
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
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setFormula("A1+B1");
      await ws.cell(0, 0).setFormula(undefined);

      expect(await ws.cell(0, 0).getValue()).toBeUndefined();
    });
  });

  describe("Cell Merge", () => {
    it("Can merge cells", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Merged");
      await ws.cell(0, 0).merge(2, 3); // Merge 2 rows x 3 columns

      // Verify merge with round-trip
      const buffer = await wb.toBytes();
      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getValue();
      expect(val).toBe("Merged");
    });

    it("Throws error when attempting to merge overlapping ranges", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).merge(2, 2); // Merge A1:B2

      // Attempt to merge overlapping range (B2:C3)
      await expect(ws.cell(1, 1).merge(2, 2)).rejects.toThrow("Merged cell overlaps with existing merge range");
    });
  });

  describe("Cell Style", () => {
    it("Can set multiple styles simultaneously", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Multi-Style");
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
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Test");
      await expect(ws.cell(0, 0).setStyle({ background: "invalid" })).rejects.toThrow();
    });

    it("Styles persist after round-trip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      // Set various styles
      await ws.cell(0, 0).setValue("Styled");
      await ws.cell(0, 0).setStyle({
        background: "00FF0000", // Red
        border: ["left", "right", "top", "bottom"],
        horizontalAlign: "center",
        verticalAlign: "top",
      });

      const bytes = await wb.toBytes();

      // Verify styles after round-trip
      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet("Test");

      // Verify value
      const val = await ws2.cell(0, 0).getValue();
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

describe("ExcelCellData type narrowing", () => {
  it("should type cell type field as ExcelCellType", () => {
    const cellData: ExcelCellData = {
      $: { r: "A1", t: "s" },
      v: ["test"],
    };

    const cellType: ExcelCellType | undefined = cellData.$.t;
    expect(cellType).toBe("s");

    // This should compile: no cast needed
    expect(["s", "b", "str", "n", "inlineStr", "e", undefined].includes(cellData.$.t)).toBe(true);
  });
});
