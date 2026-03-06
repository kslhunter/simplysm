import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

describe("ExcelWorksheet", () => {
  describe("Sheet name", () => {
    it("should change sheet name", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("OldName");

      await ws.setName("NewName");
      const name = await ws.getName();
      expect(name).toBe("NewName");
    });

    it("should preserve changed sheet name after roundtrip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("OldName");
      await ws.setName("NewName");

      const bytes = await wb.toBytes();

      const wb2 = new ExcelWorkbook(bytes);
      const names = await wb2.getWorksheetNames();
      expect(names).toContain("NewName");
      expect(names).not.toContain("OldName");

      const ws2 = await wb2.getWorksheet("NewName");
      const name = await ws2.getName();
      expect(name).toBe("NewName");
    });
  });

  describe("Row/Column copy", () => {
    it("should copy row", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      // Set source row
      await ws.cell(0, 0).setValue("A");
      await ws.cell(0, 1).setValue("B");
      await ws.cell(0, 2).setValue("C");

      // Copy row
      await ws.copyRow(0, 2);

      expect(await ws.cell(2, 0).getValue()).toBe("A");
      expect(await ws.cell(2, 1).getValue()).toBe("B");
      expect(await ws.cell(2, 2).getValue()).toBe("C");
    });

    it("should copy cell", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Original");
      await ws.copyCell({ r: 0, c: 0 }, { r: 1, c: 1 });

      expect(await ws.cell(1, 1).getValue()).toBe("Original");
    });

    it("should copy only row style", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      // Set styles
      await ws.cell(0, 0).setValue("Styled");
      await ws.cell(0, 0).setStyle({ background: "00FF0000" });
      await ws.cell(0, 1).setValue("Also Styled");
      await ws.cell(0, 1).setStyle({ background: "0000FF00" });

      // Copy only styles
      await ws.copyRowStyle(0, 2);

      // Values should not be copied
      expect(await ws.cell(2, 0).getValue()).toBeUndefined();
      expect(await ws.cell(2, 1).getValue()).toBeUndefined();

      // Styles should be copied
      const styleId0 = await ws.cell(0, 0).getStyleId();
      const styleId2 = await ws.cell(2, 0).getStyleId();
      expect(styleId2).toBe(styleId0);
    });

    it("should insert copy row when srcR < targetR", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Row0");
      await ws.cell(1, 0).setValue("Row1");
      await ws.cell(2, 0).setValue("Row2");

      // Insert copy row 0 at position 1 (existing rows are shifted)
      await ws.insertCopyRow(0, 1);

      expect(await ws.cell(0, 0).getValue()).toBe("Row0");
      expect(await ws.cell(1, 0).getValue()).toBe("Row0"); // copied
      expect(await ws.cell(2, 0).getValue()).toBe("Row1"); // shifted
      expect(await ws.cell(3, 0).getValue()).toBe("Row2"); // shifted
    });

    it("should insert copy row when srcR > targetR", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Row0");
      await ws.cell(1, 0).setValue("Row1");
      await ws.cell(2, 0).setValue("Row2");
      await ws.cell(3, 0).setValue("Row3");

      // Insert copy row 2 at position 1 (existing rows are shifted)
      await ws.insertCopyRow(2, 1);

      expect(await ws.cell(0, 0).getValue()).toBe("Row0");
      expect(await ws.cell(1, 0).getValue()).toBe("Row2"); // copied
      expect(await ws.cell(2, 0).getValue()).toBe("Row1"); // shifted
      expect(await ws.cell(3, 0).getValue()).toBe("Row2"); // shifted (original Row2)
      expect(await ws.cell(4, 0).getValue()).toBe("Row3"); // shifted
    });

    it("should insert copy row when srcR == targetR", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Row0");
      await ws.cell(1, 0).setValue("Row1");
      await ws.cell(2, 0).setValue("Row2");

      // Insert copy row 1 at position 1 (copy itself)
      await ws.insertCopyRow(1, 1);

      expect(await ws.cell(0, 0).getValue()).toBe("Row0");
      expect(await ws.cell(1, 0).getValue()).toBe("Row1"); // copied
      expect(await ws.cell(2, 0).getValue()).toBe("Row1"); // shifted (original Row1)
      expect(await ws.cell(3, 0).getValue()).toBe("Row2"); // shifted
    });

    it("should skip merge handling when skipMerge is true", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Row0");
      await ws.cell(1, 0).setValue("Row1");
      await ws.cell(0, 0).merge(0, 1); // Merge A1:B1

      const wsData = await ws["_getWsData"]();

      // Copy row 0 to row 1, but skip merge handling
      wsData.copyRow(0, 1, { skipMerge: true });

      // Row 1 should have the data but merge should not be copied
      const merges = wsData.getMergeCells();
      expect(merges).toEqual([
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // original merge, unchanged
      ]);
    });
  });

  describe("Range and cell access", () => {
    it("should get data range", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("A");
      await ws.cell(2, 3).setValue("D");

      const range = await ws.getRange();
      expect(range.s.r).toBe(0);
      expect(range.s.c).toBe(0);
      expect(range.e.r).toBe(2);
      expect(range.e.c).toBe(3);
    });

    it("should get all cells", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("A");
      await ws.cell(0, 1).setValue("B");
      await ws.cell(1, 0).setValue("C");
      await ws.cell(1, 1).setValue("D");

      const cells = await ws.getCells();
      expect(cells.length).toBe(2);
      expect(cells[0].length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Data table", () => {
    it("should get data table", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      // Headers
      await ws.cell(0, 0).setValue("Name");
      await ws.cell(0, 1).setValue("Age");
      // Data
      await ws.cell(1, 0).setValue("Alice");
      await ws.cell(1, 1).setValue(30);
      await ws.cell(2, 0).setValue("Bob");
      await ws.cell(2, 1).setValue(25);

      const data = await ws.getDataTable();
      expect(data.length).toBe(2);
      expect(data[0]["Name"]).toBe("Alice");
      expect(data[0]["Age"]).toBe(30);
      expect(data[1]["Name"]).toBe("Bob");
      expect(data[1]["Age"]).toBe(25);
    });

    it("should filter specific headers only", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Name");
      await ws.cell(0, 1).setValue("Age");
      await ws.cell(0, 2).setValue("Ignore");
      await ws.cell(1, 0).setValue("Alice");
      await ws.cell(1, 1).setValue(30);
      await ws.cell(1, 2).setValue("X");

      const data = await ws.getDataTable({
        usableHeaderNameFn: (name) => name !== "Ignore",
      });

      expect(data[0]["Name"]).toBe("Alice");
      expect(data[0]["Age"]).toBe(30);
      expect(data[0]["Ignore"]).toBeUndefined();
    });

    it("should set data matrix", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const matrix = [
        ["A", "B", "C"],
        [1, 2, 3],
        [4, 5, 6],
      ];

      await ws.setDataMatrix(matrix);

      expect(await ws.cell(0, 0).getValue()).toBe("A");
      expect(await ws.cell(0, 2).getValue()).toBe("C");
      expect(await ws.cell(2, 2).getValue()).toBe(6);
    });

    it("should set records array", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const records = [
        { Name: "Alice", Age: 30 },
        { Name: "Bob", Age: 25 },
      ];

      await ws.setRecords(records);

      // Check headers
      const headers = [await ws.cell(0, 0).getValue(), await ws.cell(0, 1).getValue()];
      expect(headers).toContain("Name");
      expect(headers).toContain("Age");

      // Check data (order may vary)
      const data = await ws.getDataTable();
      expect(data.length).toBe(2);
    });
  });

  describe("Column width", () => {
    it("should preserve column width after roundtrip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("A1");
      await ws.col(0).setWidth(25);
      await ws.col(2).setWidth(30);

      const bytes = await wb.toBytes();

      const wb2 = new ExcelWorkbook(bytes);
      await wb2.getWorksheet("Test");

      // Check cols data in XML structure
      const wsData = await (wb2 as any).zipCache.get("xl/worksheets/sheet1.xml");
      const cols = wsData.data.worksheet.cols?.[0]?.col ?? [];

      // Check width of column A (index 0, 1-based=1)
      const colA = cols.find((c: any) => c.$.min === "1" && c.$.max === "1");
      expect(colA).toBeDefined();
      expect(colA.$.width).toBe("25");

      // Check width of column C (index 2, 1-based=3)
      const colC = cols.find((c: any) => c.$.min === "3" && c.$.max === "3");
      expect(colC).toBeDefined();
      expect(colC.$.width).toBe("30");
    });
  });

  describe("Column access", () => {
    it("should get all cells in column", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("A1");
      await ws.cell(1, 0).setValue("A2");
      await ws.cell(2, 0).setValue("A3");

      const cells = await ws.col(0).getCells();
      expect(cells.length).toBe(3);
      expect(await cells[0].getValue()).toBe("A1");
      expect(await cells[1].getValue()).toBe("A2");
      expect(await cells[2].getValue()).toBe("A3");
    });
  });

  describe("Data table edge cases", () => {
    it("should return empty array when calling getDataTable on empty sheet", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Empty");
      const data = await ws.getDataTable();
      expect(data).toEqual([]);
    });

    it("should return empty array when only headers exist without data", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");
      await ws.cell(0, 0).setValue("Header1");
      await ws.cell(0, 1).setValue("Header2");
      const data = await ws.getDataTable();
      expect(data).toEqual([]);
    });
  });

  describe("Data table options", () => {
    it("should specify header row with headerRowIndex", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      // Row 0 is title
      await ws.cell(0, 0).setValue("Title");
      // Row 1 is header
      await ws.cell(1, 0).setValue("Name");
      await ws.cell(1, 1).setValue("Age");
      // Data starts from row 2
      await ws.cell(2, 0).setValue("Alice");
      await ws.cell(2, 1).setValue(30);

      const data = await ws.getDataTable({ headerRowIndex: 1 });
      expect(data.length).toBe(1);
      expect(data[0]["Name"]).toBe("Alice");
      expect(data[0]["Age"]).toBe(30);
    });

    it("should detect data end with checkEndColIndex", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Name");
      await ws.cell(0, 1).setValue("Age");
      await ws.cell(1, 0).setValue("Alice");
      await ws.cell(1, 1).setValue(30);
      await ws.cell(2, 0).setValue("Bob");
      await ws.cell(2, 1).setValue(25);
      // Row 3 has empty Name column -> data end
      await ws.cell(3, 1).setValue(999);

      const data = await ws.getDataTable({ checkEndColIndex: 0 });
      expect(data.length).toBe(2);
      expect(data[0]["Name"]).toBe("Alice");
      expect(data[1]["Name"]).toBe("Bob");
    });
  });

  describe("Merge cells", () => {
    it("should shift merge cells when inserting row", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      // Create merged cells: A1:B2 and C3:D4
      await ws.cell(0, 0).merge(1, 1); // A1:B2
      await ws.cell(2, 2).merge(3, 3); // C3:D4

      const wsData = await ws["_getWsData"](); // Access private method for testing
      wsData.shiftMergeCells(2, 1); // Shift rows >= 2 by +1

      const merges = wsData.getMergeCells();
      expect(merges).toEqual([
        { s: { r: 0, c: 0 }, e: { r: 1, c: 1 } }, // unchanged
        { s: { r: 3, c: 2 }, e: { r: 4, c: 3 } }, // shifted down by 1
      ]);
    });

    it("should shift merge cells when inserting row with merges", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Row0");
      await ws.cell(1, 0).setValue("Row1");
      await ws.cell(2, 0).setValue("Row2");

      // Create merge A3:B4 (rows 2-3, well below insertion point)
      await ws.cell(2, 0).merge(3, 1);

      // Insert copy of row 0 at position 1
      await ws.insertCopyRow(0, 1);

      // Check that merge was shifted correctly
      const wsData = await ws["_getWsData"]();
      const merges = wsData.getMergeCells();

      // Merge at rows 2-3 should shift to rows 3-4
      expect(merges).toEqual([
        { s: { r: 3, c: 0 }, e: { r: 4, c: 1 } },
      ]);

      expect(await ws.cell(0, 0).getValue()).toBe("Row0");
      expect(await ws.cell(1, 0).getValue()).toBe("Row0"); // copied
      expect(await ws.cell(2, 0).getValue()).toBe("Row1"); // shifted
      expect(await ws.cell(3, 0).getValue()).toBe("Row2"); // shifted
    });

    it("should handle multi-row merge when inserting row", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Row0");
      await ws.cell(1, 0).setValue("Row1");
      await ws.cell(2, 0).setValue("Row2");
      await ws.cell(3, 0).setValue("Row3");

      // Create merge A3:B4 (rows 2-3, below insertion point)
      await ws.cell(2, 0).merge(3, 1);

      // Insert copy of row 0 at position 1
      await ws.insertCopyRow(0, 1);

      const wsData = await ws["_getWsData"]();
      const merges = wsData.getMergeCells();

      // Merge at rows 2-3 should shift to rows 3-4 (rows >= 1 shift by 1)
      expect(merges).toHaveLength(1);
      expect(merges[0].s).toEqual({ r: 3, c: 0 });
      expect(merges[0].e).toEqual({ r: 4, c: 1 }); // shifted from 2-3 to 3-4
    });

    it("should not shift merge above insertion point", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Row0");
      await ws.cell(1, 0).setValue("Row1");
      await ws.cell(2, 0).setValue("Row2");

      // Create merge A1:B1 (row 0)
      await ws.cell(0, 0).merge(0, 1);

      // Insert copy of row 1 at position 2
      await ws.insertCopyRow(1, 2);

      const wsData = await ws["_getWsData"]();
      const merges = wsData.getMergeCells();

      // Merge should remain unchanged at A1:B1
      expect(merges).toEqual([
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      ]);
    });
  });
});
