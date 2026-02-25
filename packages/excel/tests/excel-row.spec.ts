import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

describe("ExcelRow", () => {
  describe("cell()", () => {
    it("returns cell corresponding to column index", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const row = ws.row(0);
      const cell = row.cell(0);

      await cell.setVal("Hello");
      expect(await cell.getVal()).toBe("Hello");
    });

    it("returns same instance for same index (caching)", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const row = ws.row(0);
      const cell1 = row.cell(0);
      const cell2 = row.cell(0);

      expect(cell1).toBe(cell2);
    });

    it("returns different instances for different indices", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const row = ws.row(0);
      const cell1 = row.cell(0);
      const cell2 = row.cell(1);

      expect(cell1).not.toBe(cell2);
    });
  });

  describe("getCells()", () => {
    it("returns all cells within range", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // Set range by configuring data
      await ws.cell(0, 0).setVal("A1");
      await ws.cell(0, 1).setVal("B1");
      await ws.cell(0, 2).setVal("C1");

      const row = ws.row(0);
      const cells = await row.getCells();

      expect(cells.length).toBeGreaterThanOrEqual(3);
      expect(await cells[0].getVal()).toBe("A1");
      expect(await cells[1].getVal()).toBe("B1");
      expect(await cells[2].getVal()).toBe("C1");
    });

    it("returns cell corresponding to default range (0,0) in empty worksheet", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const row = ws.row(0);
      const cells = await row.getCells();

      // Empty worksheet default range is (0,0)-(0,0) so returns one cell
      expect(cells.length).toBe(1);
      expect(await cells[0].getVal()).toBeUndefined();
    });
  });
});
