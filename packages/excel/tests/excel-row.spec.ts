import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

describe("ExcelRow", () => {
  describe("cell()", () => {
    it("returns cell corresponding to column index", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const row = ws.row(0);
      const cell = row.cell(0);

      await cell.setValue("Hello");
      expect(await cell.getValue()).toBe("Hello");
    });

    it("returns same instance for same index (caching)", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const row = ws.row(0);
      const cell1 = row.cell(0);
      const cell2 = row.cell(0);

      expect(cell1).toBe(cell2);
    });

  });

  describe("getCells()", () => {
    it("returns all cells within range", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      // Set range by configuring data
      await ws.cell(0, 0).setValue("A1");
      await ws.cell(0, 1).setValue("B1");
      await ws.cell(0, 2).setValue("C1");

      const row = ws.row(0);
      const cells = await row.getCells();

      expect(cells.length).toBeGreaterThanOrEqual(3);
      expect(await cells[0].getValue()).toBe("A1");
      expect(await cells[1].getValue()).toBe("B1");
      expect(await cells[2].getValue()).toBe("C1");
    });

    it("returns cell corresponding to default range (0,0) in empty worksheet", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const row = ws.row(0);
      const cells = await row.getCells();

      // Empty worksheet default range is (0,0)-(0,0) so returns one cell
      expect(cells.length).toBe(1);
      expect(await cells[0].getValue()).toBeUndefined();
    });
  });
});
