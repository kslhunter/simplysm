import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

describe("ExcelCol", () => {
  describe("cell()", () => {
    it("행 인덱스에 해당하는 셀을 반환한다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const col = ws.col(0);
      const cell = col.cell(0);

      await cell.setVal("Hello");
      expect(await cell.getVal()).toBe("Hello");
    });

    it("동일 인덱스에 대해 같은 인스턴스를 반환한다 (캐싱)", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const col = ws.col(0);
      const cell1 = col.cell(0);
      const cell2 = col.cell(0);

      expect(cell1).toBe(cell2);
    });

    it("다른 인덱스에 대해 다른 인스턴스를 반환한다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const col = ws.col(0);
      const cell1 = col.cell(0);
      const cell2 = col.cell(1);

      expect(cell1).not.toBe(cell2);
    });
  });

  describe("getCells()", () => {
    it("범위 내 모든 셀을 반환한다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // 데이터 설정으로 범위 지정
      await ws.cell(0, 0).setVal("A1");
      await ws.cell(1, 0).setVal("A2");
      await ws.cell(2, 0).setVal("A3");

      const col = ws.col(0);
      const cells = await col.getCells();

      expect(cells.length).toBeGreaterThanOrEqual(3);
      expect(await cells[0].getVal()).toBe("A1");
      expect(await cells[1].getVal()).toBe("A2");
      expect(await cells[2].getVal()).toBe("A3");
    });

    it("빈 워크시트에서 기본 범위(0,0)에 해당하는 셀을 반환한다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const col = ws.col(0);
      const cells = await col.getCells();

      // 빈 워크시트의 기본 범위는 (0,0)-(0,0)이므로 하나의 셀 반환
      expect(cells.length).toBe(1);
      expect(await cells[0].getVal()).toBeUndefined();
    });
  });

  describe("setWidth()", () => {
    it("열 너비를 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // 데이터 추가 후 너비 설정
      await ws.cell(0, 0).setVal("Test");
      await ws.col(0).setWidth(20);

      // 라운드트립으로 설정 확인
      const bytes = await wb.getBytes();
      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      // 값이 유지되는지 확인 (너비는 직접 확인하기 어려우므로 에러 없이 동작하는지만 확인)
      expect(await ws2.cell(0, 0).getVal()).toBe("Test");
    });

    it("여러 열에 다른 너비를 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("A");
      await ws.cell(0, 1).setVal("B");
      await ws.cell(0, 2).setVal("C");

      await ws.col(0).setWidth(10);
      await ws.col(1).setWidth(20);
      await ws.col(2).setWidth(30);

      // 에러 없이 라운드트립 가능
      const bytes = await wb.getBytes();
      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      expect(await ws2.cell(0, 0).getVal()).toBe("A");
      expect(await ws2.cell(0, 1).getVal()).toBe("B");
      expect(await ws2.cell(0, 2).getVal()).toBe("C");
    });
  });
});
