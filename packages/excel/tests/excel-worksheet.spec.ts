import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

describe("ExcelWorksheet", () => {
  describe("Sheet name", () => {
    it("should get sheet name", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("MySheet");

      const name = await ws.getName();
      expect(name).toBe("MySheet");
    });

    it("should change sheet name", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("OldName");

      await ws.setName("NewName");
      const name = await ws.getName();
      expect(name).toBe("NewName");
    });

    it("should preserve changed sheet name after roundtrip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("OldName");
      await ws.setName("NewName");

      const bytes = await wb.getBytes();

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
      const ws = await wb.createWorksheet("Test");

      // Set source row
      await ws.cell(0, 0).setVal("A");
      await ws.cell(0, 1).setVal("B");
      await ws.cell(0, 2).setVal("C");

      // Copy row
      await ws.copyRow(0, 2);

      expect(await ws.cell(2, 0).getVal()).toBe("A");
      expect(await ws.cell(2, 1).getVal()).toBe("B");
      expect(await ws.cell(2, 2).getVal()).toBe("C");
    });

    it("should copy cell", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Original");
      await ws.copyCell({ r: 0, c: 0 }, { r: 1, c: 1 });

      expect(await ws.cell(1, 1).getVal()).toBe("Original");
    });

    it("should copy only row style", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // Set styles
      await ws.cell(0, 0).setVal("Styled");
      await ws.cell(0, 0).setStyle({ background: "00FF0000" });
      await ws.cell(0, 1).setVal("Also Styled");
      await ws.cell(0, 1).setStyle({ background: "0000FF00" });

      // Copy only styles
      await ws.copyRowStyle(0, 2);

      // Values should not be copied
      expect(await ws.cell(2, 0).getVal()).toBeUndefined();
      expect(await ws.cell(2, 1).getVal()).toBeUndefined();

      // Styles should be copied
      const styleId0 = await ws.cell(0, 0).getStyleId();
      const styleId2 = await ws.cell(2, 0).getStyleId();
      expect(styleId2).toBe(styleId0);
    });

    it("should insert copy row when srcR < targetR", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Row0");
      await ws.cell(1, 0).setVal("Row1");
      await ws.cell(2, 0).setVal("Row2");

      // Insert copy row 0 at position 1 (existing rows are shifted)
      await ws.insertCopyRow(0, 1);

      expect(await ws.cell(0, 0).getVal()).toBe("Row0");
      expect(await ws.cell(1, 0).getVal()).toBe("Row0"); // copied
      expect(await ws.cell(2, 0).getVal()).toBe("Row1"); // shifted
      expect(await ws.cell(3, 0).getVal()).toBe("Row2"); // shifted
    });

    it("should insert copy row when srcR > targetR", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Row0");
      await ws.cell(1, 0).setVal("Row1");
      await ws.cell(2, 0).setVal("Row2");
      await ws.cell(3, 0).setVal("Row3");

      // Insert copy row 2 at position 1 (existing rows are shifted)
      await ws.insertCopyRow(2, 1);

      expect(await ws.cell(0, 0).getVal()).toBe("Row0");
      expect(await ws.cell(1, 0).getVal()).toBe("Row2"); // copied
      expect(await ws.cell(2, 0).getVal()).toBe("Row1"); // shifted
      expect(await ws.cell(3, 0).getVal()).toBe("Row2"); // shifted (original Row2)
      expect(await ws.cell(4, 0).getVal()).toBe("Row3"); // shifted
    });

    it("should insert copy row when srcR == targetR", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Row0");
      await ws.cell(1, 0).setVal("Row1");
      await ws.cell(2, 0).setVal("Row2");

      // Insert copy row 1 at position 1 (copy itself)
      await ws.insertCopyRow(1, 1);

      expect(await ws.cell(0, 0).getVal()).toBe("Row0");
      expect(await ws.cell(1, 0).getVal()).toBe("Row1"); // copied
      expect(await ws.cell(2, 0).getVal()).toBe("Row1"); // shifted (original Row1)
      expect(await ws.cell(3, 0).getVal()).toBe("Row2"); // shifted
    });
  });

  describe("Range and cell access", () => {
    it("should get data range", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("A");
      await ws.cell(2, 3).setVal("D");

      const range = await ws.getRange();
      expect(range.s.r).toBe(0);
      expect(range.s.c).toBe(0);
      expect(range.e.r).toBe(2);
      expect(range.e.c).toBe(3);
    });

    it("should get all cells", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("A");
      await ws.cell(0, 1).setVal("B");
      await ws.cell(1, 0).setVal("C");
      await ws.cell(1, 1).setVal("D");

      const cells = await ws.getCells();
      expect(cells.length).toBe(2);
      expect(cells[0].length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Data table", () => {
    it("should get data table", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // Headers
      await ws.cell(0, 0).setVal("Name");
      await ws.cell(0, 1).setVal("Age");
      // Data
      await ws.cell(1, 0).setVal("Alice");
      await ws.cell(1, 1).setVal(30);
      await ws.cell(2, 0).setVal("Bob");
      await ws.cell(2, 1).setVal(25);

      const data = await ws.getDataTable();
      expect(data.length).toBe(2);
      expect(data[0]["Name"]).toBe("Alice");
      expect(data[0]["Age"]).toBe(30);
      expect(data[1]["Name"]).toBe("Bob");
      expect(data[1]["Age"]).toBe(25);
    });

    it("should filter specific headers only", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Name");
      await ws.cell(0, 1).setVal("Age");
      await ws.cell(0, 2).setVal("Ignore");
      await ws.cell(1, 0).setVal("Alice");
      await ws.cell(1, 1).setVal(30);
      await ws.cell(1, 2).setVal("X");

      const data = await ws.getDataTable({
        usableHeaderNameFn: (name) => name !== "Ignore",
      });

      expect(data[0]["Name"]).toBe("Alice");
      expect(data[0]["Age"]).toBe(30);
      expect(data[0]["Ignore"]).toBeUndefined();
    });

    it("should set data matrix", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const matrix = [
        ["A", "B", "C"],
        [1, 2, 3],
        [4, 5, 6],
      ];

      await ws.setDataMatrix(matrix);

      expect(await ws.cell(0, 0).getVal()).toBe("A");
      expect(await ws.cell(0, 2).getVal()).toBe("C");
      expect(await ws.cell(2, 2).getVal()).toBe(6);
    });

    it("should set records array", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const records = [
        { Name: "Alice", Age: 30 },
        { Name: "Bob", Age: 25 },
      ];

      await ws.setRecords(records);

      // Check headers
      const headers = [await ws.cell(0, 0).getVal(), await ws.cell(0, 1).getVal()];
      expect(headers).toContain("Name");
      expect(headers).toContain("Age");

      // Check data (order may vary)
      const data = await ws.getDataTable();
      expect(data.length).toBe(2);
    });
  });

  describe("View settings", () => {
    it("should set zoom level", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.setZoom(85);
      // Success if set without error
    });

    it("should set pane freeze", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.setFix({ r: 1 }); // Freeze 1 row
      await ws.setFix({ c: 2 }); // Freeze 2 columns
      await ws.setFix({ r: 1, c: 1 }); // Freeze 1 row and 1 column
      // Success if set without error
    });
  });

  describe("Column width", () => {
    it("should set column width", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.col(0).setWidth(20);
      // Success if set without error
    });

    it("should preserve column width after roundtrip", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("A1");
      await ws.col(0).setWidth(25);
      await ws.col(2).setWidth(30);

      const bytes = await wb.getBytes();

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
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("A1");
      await ws.cell(1, 0).setVal("A2");
      await ws.cell(2, 0).setVal("A3");

      const cells = await ws.col(0).getCells();
      expect(cells.length).toBe(3);
      expect(await cells[0].getVal()).toBe("A1");
      expect(await cells[1].getVal()).toBe("A2");
      expect(await cells[2].getVal()).toBe("A3");
    });
  });

  describe("Data table edge cases", () => {
    it("should return empty array when calling getDataTable on empty sheet", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Empty");
      const data = await ws.getDataTable();
      expect(data).toEqual([]);
    });

    it("should return empty array when only headers exist without data", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");
      await ws.cell(0, 0).setVal("Header1");
      await ws.cell(0, 1).setVal("Header2");
      const data = await ws.getDataTable();
      expect(data).toEqual([]);
    });
  });

  describe("Data table options", () => {
    it("should specify header row with headerRowIndex", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // Row 0 is title
      await ws.cell(0, 0).setVal("Title");
      // Row 1 is header
      await ws.cell(1, 0).setVal("Name");
      await ws.cell(1, 1).setVal("Age");
      // Data starts from row 2
      await ws.cell(2, 0).setVal("Alice");
      await ws.cell(2, 1).setVal(30);

      const data = await ws.getDataTable({ headerRowIndex: 1 });
      expect(data.length).toBe(1);
      expect(data[0]["Name"]).toBe("Alice");
      expect(data[0]["Age"]).toBe(30);
    });

    it("should detect data end with checkEndColIndex", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Name");
      await ws.cell(0, 1).setVal("Age");
      await ws.cell(1, 0).setVal("Alice");
      await ws.cell(1, 1).setVal(30);
      await ws.cell(2, 0).setVal("Bob");
      await ws.cell(2, 1).setVal(25);
      // Row 3 has empty Name column -> data end
      await ws.cell(3, 1).setVal(999);

      const data = await ws.getDataTable({ checkEndColIndex: 0 });
      expect(data.length).toBe(2);
      expect(data[0]["Name"]).toBe("Alice");
      expect(data[1]["Name"]).toBe("Bob");
    });
  });
});
