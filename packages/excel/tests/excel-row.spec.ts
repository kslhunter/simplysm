import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

describe("ExcelRow", () => {
  describe("cell()", () => {
    it("열 인덱스에 해당하는 셀을 반환한다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const row = ws.row(0);
      const cell = row.cell(0);

      await cell.setVal("Hello");
      expect(await cell.getVal()).toBe("Hello");
    });

    it("동일 인덱스에 대해 같은 인스턴스를 반환한다 (캐싱)", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const row = ws.row(0);
      const cell1 = row.cell(0);
      const cell2 = row.cell(0);

      expect(cell1).toBe(cell2);
    });

    it("다른 인덱스에 대해 다른 인스턴스를 반환한다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const row = ws.row(0);
      const cell1 = row.cell(0);
      const cell2 = row.cell(1);

      expect(cell1).not.toBe(cell2);
    });
  });

  describe("getCells()", () => {
    it("범위 내 모든 셀을 반환한다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // 데이터 설정으로 범위 지정
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

    it("빈 워크시트에서 기본 범위(0,0)에 해당하는 셀을 반환한다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const row = ws.row(0);
      const cells = await row.getCells();

      // 빈 워크시트의 기본 범위는 (0,0)-(0,0)이므로 하나의 셀 반환
      expect(cells.length).toBe(1);
      expect(await cells[0].getVal()).toBeUndefined();
    });
  });
});
