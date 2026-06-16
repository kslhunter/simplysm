import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ExcelWorkbook } from "../src/excel-workbook";
import { ExcelWrapper } from "../src/excel-wrapper";
import type { ExcelXmlWorksheetData } from "../src/types";

async function getWsData(
  wb: ExcelWorkbook,
  sheetFile = "xl/worksheets/sheet1.xml",
): Promise<{ data: ExcelXmlWorksheetData; serialize: () => unknown }> {
  return (await (wb as any).zipCache.get(sheetFile)) as {
    data: ExcelXmlWorksheetData;
    serialize: () => unknown;
  };
}

async function getAutoFilterRef(
  wb: ExcelWorkbook,
  sheetFile = "xl/worksheets/sheet1.xml",
): Promise<string | undefined> {
  const ws = await getWsData(wb, sheetFile);
  return ws.data.worksheet.autoFilter?.[0].$.ref;
}

describe("ExcelWorksheet.setAutoFilter", () => {
  it("범위객체를 autoFilter ref 문자열로 설정한다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    await ws.setAutoFilter({ s: { r: 0, c: 0 }, e: { r: 2, c: 3 } });

    expect(await getAutoFilterRef(wb)).toBe("A1:D3");
    await wb.close();
  });

  it("단일 셀 범위는 단일 주소로 축약된다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    await ws.setAutoFilter({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } });

    expect(await getAutoFilterRef(wb)).toBe("A1");
    await wb.close();
  });

  it("cleanup 후 autoFilter 가 sheetData 뒤·conditionalFormatting 앞에 위치한다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    await ws.cell(0, 0).setValue("h");
    await ws.setAutoFilter({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
    await ws.addConditionalFormat({
      ref: "A2:A10",
      rules: [{ type: "cellIs", op: "<", value: 1, style: { background: "00FF0000" } }],
    });

    const wsData = await getWsData(wb);
    wsData.serialize();

    const keys = Object.keys(wsData.data.worksheet);
    expect(keys.indexOf("autoFilter")).toBeGreaterThan(keys.indexOf("sheetData"));
    expect(keys.indexOf("autoFilter")).toBeLessThan(keys.indexOf("conditionalFormatting"));
    await wb.close();
  });

  it("toBytes 후 다시 열어도 autoFilter ref 가 보존된다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Test");

    await ws.cell(0, 0).setValue("h");
    await ws.setAutoFilter({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });

    const bytes = await wb.toBytes();
    await wb.close();

    const wb2 = new ExcelWorkbook(bytes);
    try {
      expect(await getAutoFilterRef(wb2)).toBe("A1:C1");
    } finally {
      await wb2.close();
    }
  });
});

describe("ExcelWrapper.write — 헤더 자동 필터", () => {
  const schema = z.object({
    name: z.string().describe("이름"),
    age: z.number().describe("나이"),
    email: z.string().optional().describe("이메일"),
    active: z.boolean().default(false).describe("활성"),
  });

  it("출력 표 전체 범위(헤더+데이터)에 필터가 적용된다", async () => {
    const wrapper = new ExcelWrapper(schema);
    const wb = await wrapper.write("Users", [
      { name: "A", age: 1 },
      { name: "B", age: 2 },
    ]);

    try {
      expect(await getAutoFilterRef(wb)).toBe("A1:D3");
    } finally {
      await wb.close();
    }
  });

  it("데이터 0건이면 헤더행만 필터 범위", async () => {
    const wrapper = new ExcelWrapper(schema);
    const wb = await wrapper.write("Empty", []);

    try {
      expect(await getAutoFilterRef(wb)).toBe("A1:D1");
    } finally {
      await wb.close();
    }
  });

  it("toBytes 후 다시 열어도 필터가 보존된다", async () => {
    const wrapper = new ExcelWrapper(schema);
    const wb = await wrapper.write("Users", [{ name: "A", age: 1 }]);
    const bytes = await wb.toBytes();
    await wb.close();

    const wb2 = new ExcelWorkbook(bytes);
    try {
      expect(await getAutoFilterRef(wb2)).toBe("A1:D2");
    } finally {
      await wb2.close();
    }
  });
});
