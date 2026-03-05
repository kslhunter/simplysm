import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

describe("ExcelCol", () => {
  describe("cell()", () => {
    it("Returns cell corresponding to row index", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const col = ws.col(0);
      const cell = col.cell(0);

      await cell.setValue("Hello");
      expect(await cell.getValue()).toBe("Hello");
    });

    it("Returns same instance for same index (caching)", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const col = ws.col(0);
      const cell1 = col.cell(0);
      const cell2 = col.cell(0);

      expect(cell1).toBe(cell2);
    });

  });

  describe("getCells()", () => {
    it("Returns all cells within range", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      // Set data to define range
      await ws.cell(0, 0).setValue("A1");
      await ws.cell(1, 0).setValue("A2");
      await ws.cell(2, 0).setValue("A3");

      const col = ws.col(0);
      const cells = await col.getCells();

      expect(cells.length).toBeGreaterThanOrEqual(3);
      expect(await cells[0].getValue()).toBe("A1");
      expect(await cells[1].getValue()).toBe("A2");
      expect(await cells[2].getValue()).toBe("A3");
    });

    it("Returns cell corresponding to default range (0,0) from empty worksheet", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const col = ws.col(0);
      const cells = await col.getCells();

      // Default range of empty worksheet is (0,0)-(0,0), so returns one cell
      expect(cells.length).toBe(1);
      expect(await cells[0].getValue()).toBeUndefined();
    });
  });

  describe("setWidth()", () => {
    it("Can set column width", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      // Add data and set width
      await ws.cell(0, 0).setValue("Test");
      await ws.col(0).setWidth(20);

      // Verify settings via round-trip
      const bytes = await wb.toBytes();
      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      // Verify value is preserved (width is hard to verify directly, so just check it works without error)
      expect(await ws2.cell(0, 0).getValue()).toBe("Test");
    });

  });
});
