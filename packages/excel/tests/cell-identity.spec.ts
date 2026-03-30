import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

describe("셀 인스턴스 통합 (DESIGN-001)", () => {
  it("row 경로와 col 경로로 같은 셀에 접근하면 동일 인스턴스를 반환한다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    const cellFromRow = ws.row(0).cell(0);
    const cellFromCol = ws.col(0).cell(0);

    expect(cellFromRow).toBe(cellFromCol);
  });

  it("cell 단축 메서드와 col 경로로 같은 셀에 접근하면 동일 인스턴스를 반환한다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    const cellDirect = ws.cell(0, 0);
    const cellFromCol = ws.col(0).cell(0);

    expect(cellDirect).toBe(cellFromCol);
  });

  it("서로 다른 좌표의 셀은 다른 인스턴스를 반환한다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    const cell00 = ws.cell(0, 0);
    const cell01 = ws.cell(0, 1);
    const cell10 = ws.cell(1, 0);

    expect(cell00).not.toBe(cell01);
    expect(cell00).not.toBe(cell10);
  });
});
