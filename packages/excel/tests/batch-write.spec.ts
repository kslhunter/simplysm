import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";

describe("배치 셀 쓰기 (PERF-001)", () => {
  it("setDataMatrix: 문자열, 숫자, boolean 혼합 데이터를 올바르게 기록한다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    const matrix = [
      ["Header1", "Header2", "Header3"],
      ["text", 42, true],
      [undefined, 0, false],
    ];

    await ws.setDataMatrix(matrix);

    expect(await ws.cell(0, 0).getValue()).toBe("Header1");
    expect(await ws.cell(0, 1).getValue()).toBe("Header2");
    expect(await ws.cell(1, 0).getValue()).toBe("text");
    expect(await ws.cell(1, 1).getValue()).toBe(42);
    expect(await ws.cell(1, 2).getValue()).toBe(true);
    expect(await ws.cell(2, 0).getValue()).toBeUndefined();
    expect(await ws.cell(2, 1).getValue()).toBe(0);
    expect(await ws.cell(2, 2).getValue()).toBe(false);
  });

  it("setDataMatrix: DateOnly, DateTime, Time 값을 올바르게 기록한다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    const date = new DateOnly(2024, 6, 15);
    const dateTime = new DateTime(2024, 6, 15, 14, 30, 0);
    const time = new Time(9, 0, 0);

    await ws.setDataMatrix([[date, dateTime, time]]);

    const val0 = await ws.cell(0, 0).getValue();
    expect(val0).toBeInstanceOf(DateOnly);
    expect((val0 as DateOnly).year).toBe(2024);

    const val1 = await ws.cell(0, 1).getValue();
    expect(val1).toBeInstanceOf(DateTime);
    expect((val1 as DateTime).hour).toBe(14);

    const val2 = await ws.cell(0, 2).getValue();
    expect(val2).toBeInstanceOf(Time);
    expect((val2 as Time).hour).toBe(9);
  });

  it("setRecords: 헤더와 데이터를 올바르게 기록한다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    const records = [
      { Name: "Alice", Age: 30, Active: true },
      { Name: "Bob", Age: 25, Active: false },
    ];

    await ws.setRecords(records);

    // 헤더 행
    const h0 = await ws.cell(0, 0).getValue();
    const h1 = await ws.cell(0, 1).getValue();
    const h2 = await ws.cell(0, 2).getValue();
    const headers = [h0, h1, h2];
    expect(headers).toContain("Name");
    expect(headers).toContain("Age");
    expect(headers).toContain("Active");

    // 데이터 행
    const data = await ws.getDataTable();
    expect(data.length).toBe(2);
    expect(data[0]["Name"]).toBe("Alice");
    expect(data[1]["Age"]).toBe(25);
  });

  it("개별 cell.setValue는 기존 동작을 유지한다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    await ws.cell(0, 0).setValue("individual");
    expect(await ws.cell(0, 0).getValue()).toBe("individual");

    await ws.cell(0, 1).setValue(100);
    expect(await ws.cell(0, 1).getValue()).toBe(100);
  });
});
