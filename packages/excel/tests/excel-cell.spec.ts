import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";
import { ExcelXmlWorksheet } from "../src/xml/excel-xml-worksheet";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";
import type { ExcelCellData, ExcelCellType } from "../src";

describe("ExcelXmlWorksheet.getCellVal - inline string", () => {
  it("should read plain string inline text (no attributes)", () => {
    const ws = new ExcelXmlWorksheet({
      worksheet: {
        $: { xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main" },
        sheetData: [{
          row: [{
            $: { r: "1" },
            c: [{
              $: { r: "A1", t: "inlineStr" },
              is: [{ t: ["ID"] }],
            }],
          }],
        }],
      },
    });

    expect(ws.getCellVal({ r: 0, c: 0 })).toBe("ID");
  });

  it("should read object-form inline text (with attributes)", () => {
    const ws = new ExcelXmlWorksheet({
      worksheet: {
        $: { xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main" },
        sheetData: [{
          row: [{
            $: { r: "1" },
            c: [{
              $: { r: "A1", t: "inlineStr" },
              is: [{ t: [{ _: "Hello" }] }],
            }],
          }],
        }],
      },
    });

    expect(ws.getCellVal({ r: 0, c: 0 })).toBe("Hello");
  });
});

describe("ExcelCell", () => {
  describe("셀 값 읽기/쓰기 - 기본 타입", () => {
    it("string 값 읽기/쓰기 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Hello World");
      const val = await ws.cell(0, 0).getValue();

      expect(val).toBe("Hello World");
    });

    it("number 값 읽기/쓰기 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(12345);
      await ws.cell(0, 1).setValue(3.14159);
      await ws.cell(0, 2).setValue(-100);
      await ws.cell(0, 3).setValue(0);

      expect(await ws.cell(0, 0).getValue()).toBe(12345);
      expect(await ws.cell(0, 1).getValue()).toBe(3.14159);
      expect(await ws.cell(0, 2).getValue()).toBe(-100);
      expect(await ws.cell(0, 3).getValue()).toBe(0);
    });

    it("boolean 값 읽기/쓰기 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(true);
      await ws.cell(0, 1).setValue(false);

      expect(await ws.cell(0, 0).getValue()).toBe(true);
      expect(await ws.cell(0, 1).getValue()).toBe(false);
    });

    it("undefined 값을 설정하면 셀 삭제", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Initial");
      expect(await ws.cell(0, 0).getValue()).toBe("Initial");

      await ws.cell(0, 0).setValue(undefined);
      expect(await ws.cell(0, 0).getValue()).toBeUndefined();
    });

    it("지원하지 않는 타입 설정 시 오류 발생", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await expect(ws.cell(0, 0).setValue({} as any)).rejects.toThrow("지원하지 않는 타입");

      await expect(ws.cell(0, 1).setValue([] as any)).rejects.toThrow("지원하지 않는 타입");
    });
  });

  describe("셀 값 읽기/쓰기 - 날짜/시간 타입", () => {
    it("DateOnly 값 읽기/쓰기 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const date = new DateOnly(2024, 6, 15);
      await ws.cell(0, 0).setValue(date);

      const val = await ws.cell(0, 0).getValue();
      expect(val).toBeInstanceOf(DateOnly);
      expect((val as DateOnly).year).toBe(2024);
      expect((val as DateOnly).month).toBe(6);
      expect((val as DateOnly).day).toBe(15);
    });

    it("DateTime 값 읽기/쓰기 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const dateTime = new DateTime(2024, 6, 15, 14, 30, 45);
      await ws.cell(0, 0).setValue(dateTime);

      const val = await ws.cell(0, 0).getValue();
      expect(val).toBeInstanceOf(DateTime);
      expect((val as DateTime).year).toBe(2024);
      expect((val as DateTime).month).toBe(6);
      expect((val as DateTime).day).toBe(15);
      expect((val as DateTime).hour).toBe(14);
      expect((val as DateTime).minute).toBe(30);
      expect((val as DateTime).second).toBe(45);
    });

    it("Time 값 읽기/쓰기 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const time = new Time(14, 30, 45);
      await ws.cell(0, 0).setValue(time);

      const val = await ws.cell(0, 0).getValue();
      expect(val).toBeInstanceOf(Time);
      expect((val as Time).hour).toBe(14);
      expect((val as Time).minute).toBe(30);
      expect((val as Time).second).toBe(45);
    });

    it("왕복 변환 후 DateOnly 값 유지", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const date = new DateOnly(2024, 6, 15);
      await ws.cell(0, 0).setValue(date);

      const bytes = await wb.toBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getValue();
      expect(val).toBeInstanceOf(DateOnly);
      expect((val as DateOnly).year).toBe(2024);
      expect((val as DateOnly).month).toBe(6);
      expect((val as DateOnly).day).toBe(15);
      await wb2.close();
    });

    it("왕복 변환 후 DateTime 값 유지", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const dateTime = new DateTime(2024, 6, 15, 14, 30, 45);
      await ws.cell(0, 0).setValue(dateTime);

      const bytes = await wb.toBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getValue();
      expect(val).toBeInstanceOf(DateTime);
      expect((val as DateTime).year).toBe(2024);
      expect((val as DateTime).month).toBe(6);
      expect((val as DateTime).day).toBe(15);
      expect((val as DateTime).hour).toBe(14);
      expect((val as DateTime).minute).toBe(30);
      expect((val as DateTime).second).toBe(45);
      await wb2.close();
    });

    it("왕복 변환 후 Time 값 유지", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      const time = new Time(14, 30, 45);
      await ws.cell(0, 0).setValue(time);

      const bytes = await wb.toBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getValue();
      expect(val).toBeInstanceOf(Time);
      expect((val as Time).hour).toBe(14);
      expect((val as Time).minute).toBe(30);
      expect((val as Time).second).toBe(45);
      await wb2.close();
    });
  });

  describe("수식", () => {
    it("수식 설정 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(10);
      await ws.cell(0, 1).setValue(20);
      await ws.cell(0, 2).setFormula("A1+B1");

      // Verify formula directly
      const formula = await ws.cell(0, 2).getFormula();
      expect(formula).toBe("A1+B1");

      // Also verify with round-trip
      const buffer = await wb.toBytes();

      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);
      // Formula exists but value must be calculated by Excel
      expect(ws2).toBeDefined();
    });

    it("왕복 변환 후 수식 유지", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(10);
      await ws.cell(0, 1).setValue(20);
      await ws.cell(0, 2).setFormula("SUM(A1:B1)");

      const buffer = await wb.toBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);

      // Verify that formula string is saved
      const formula = await ws2.cell(0, 2).getFormula();
      expect(formula).toBe("SUM(A1:B1)");
      await wb2.close();
    });

    it("수식을 undefined로 설정하면 삭제", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setFormula("A1+B1");
      await ws.cell(0, 0).setFormula(undefined);

      expect(await ws.cell(0, 0).getValue()).toBeUndefined();
    });
  });

  describe("셀 병합", () => {
    it("셀 병합 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Merged");
      await ws.cell(0, 0).merge(2, 3); // Merge 2 rows x 3 columns

      // Verify merge with round-trip
      const buffer = await wb.toBytes();
      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getValue();
      expect(val).toBe("Merged");
    });

    it("겹치는 범위 병합 시도 시 오류 발생", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).merge(2, 2); // Merge A1:B2

      // Attempt to merge overlapping range (B2:C3)
      await expect(ws.cell(1, 1).merge(2, 2)).rejects.toThrow("병합");
    });
  });

  describe("셀 스타일", () => {
    it("복수 스타일 동시 설정 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Multi-Style");
      await ws.cell(0, 0).setStyle({
        background: "00FFFF00",
        border: ["left", "right"],
        horizontalAlign: "center",
        verticalAlign: "top",
      });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("잘못된 색상 형식에 대해 오류 발생", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue("Test");
      await expect(ws.cell(0, 0).setStyle({ background: "invalid" })).rejects.toThrow();
    });

    it("왕복 변환 후 스타일 유지", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      // Set various styles
      await ws.cell(0, 0).setValue("Styled");
      await ws.cell(0, 0).setStyle({
        background: "00FF0000", // Red
        border: ["left", "right", "top", "bottom"],
        horizontalAlign: "center",
        verticalAlign: "top",
      });

      const bytes = await wb.toBytes();

      // Verify styles after round-trip
      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet("Test");

      // Verify value
      const val = await ws2.cell(0, 0).getValue();
      expect(val).toBe("Styled");

      // Verify style ID exists
      const styleId = await ws2.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();

      // Verify style data at XML level
      const styleData = await (wb2 as any).zipCache.get("xl/styles.xml");
      const styleIdNum = parseInt(styleId!, 10);
      const xf = styleData.data.styleSheet.cellXfs[0].xf[styleIdNum];

      // Verify background color
      expect(xf.$.fillId).toBeDefined();
      const fillId = parseInt(xf.$.fillId, 10);
      const fill = styleData.data.styleSheet.fills[0].fill[fillId];
      expect(fill.patternFill[0].fgColor[0].$.rgb).toBe("00FF0000");

      // Verify borders
      expect(xf.$.borderId).toBeDefined();
      const borderId = parseInt(xf.$.borderId, 10);
      const border = styleData.data.styleSheet.borders[0].border[borderId];
      expect(border.left).toBeDefined();
      expect(border.right).toBeDefined();
      expect(border.top).toBeDefined();
      expect(border.bottom).toBeDefined();

      // Verify alignment
      expect(xf.alignment).toBeDefined();
      expect(xf.alignment[0].$.horizontal).toBe("center");
      expect(xf.alignment[0].$.vertical).toBe("top");
    });

    it("numberFormatCode로 커스텀 숫자 형식 적용", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(1.23456789);
      await ws.cell(0, 0).setStyle({ numberFormatCode: "0.000000" });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();

      const styleData = await (wb as any).zipCache.get("xl/styles.xml");
      const xf = styleData.data.styleSheet.cellXfs[0].xf[parseInt(styleId!, 10)];
      expect(xf.$.numFmtId).toBeDefined();
      expect(xf.$.applyNumberFormat).toBe("1");
      expect(styleData.getNumFmtCode(xf.$.numFmtId)).toBe("0.000000");
    });

    it("numberFormat과 numberFormatCode 동시 지정 시 numberFormatCode가 우선", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(1.23456789);
      await ws.cell(0, 0).setStyle({
        numberFormat: "number",
        numberFormatCode: "0.000000",
      });

      await ws.cell(1, 0).setValue(2);
      await ws.cell(1, 0).setStyle({
        numberFormat: "DateOnly",
        numberFormatCode: "yyyy-mm-dd hh:mm",
      });

      const styleId0 = await ws.cell(0, 0).getStyleId();
      const styleId1 = await ws.cell(1, 0).getStyleId();
      expect(styleId0).toBeDefined();
      expect(styleId1).toBeDefined();

      const styleData = await (wb as any).zipCache.get("xl/styles.xml");
      const xf0 = styleData.data.styleSheet.cellXfs[0].xf[parseInt(styleId0!, 10)];
      const xf1 = styleData.data.styleSheet.cellXfs[0].xf[parseInt(styleId1!, 10)];
      expect(styleData.getNumFmtCode(xf0.$.numFmtId)).toBe("0.000000");
      expect(styleData.getNumFmtCode(xf1.$.numFmtId)).toBe("yyyy-mm-dd hh:mm");
    });

    it("동일 formatCode는 numFmts에 중복 등록되지 않음", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(1.1);
      await ws.cell(1, 0).setValue(2.2);
      await ws.cell(0, 0).setStyle({ numberFormatCode: "0.000000" });
      await ws.cell(1, 0).setStyle({ numberFormatCode: "0.000000" });

      const styleId0 = await ws.cell(0, 0).getStyleId();
      const styleId1 = await ws.cell(1, 0).getStyleId();
      expect(styleId0).toBeDefined();
      expect(styleId1).toBeDefined();

      const styleData = await (wb as any).zipCache.get("xl/styles.xml");
      const xf0 = styleData.data.styleSheet.cellXfs[0].xf[parseInt(styleId0!, 10)];
      const xf1 = styleData.data.styleSheet.cellXfs[0].xf[parseInt(styleId1!, 10)];

      expect(xf0.$.numFmtId).toBe(xf1.$.numFmtId);

      const numFmts = styleData.data.styleSheet.numFmts[0].numFmt;
      const matches = numFmts.filter((item: any) => item.$.formatCode === "0.000000");
      expect(matches.length).toBe(1);
    });

    it("서로 다른 formatCode는 독립된 numFmtId로 등록", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(1);
      await ws.cell(1, 0).setValue(2);
      await ws.cell(2, 0).setValue(0.5);
      await ws.cell(0, 0).setStyle({ numberFormatCode: "0.000000" });
      await ws.cell(1, 0).setStyle({ numberFormatCode: "#,##0.00" });
      await ws.cell(2, 0).setStyle({ numberFormatCode: "0.00%" });

      const styleId0 = await ws.cell(0, 0).getStyleId();
      const styleId1 = await ws.cell(1, 0).getStyleId();
      const styleId2 = await ws.cell(2, 0).getStyleId();
      expect(styleId0).toBeDefined();
      expect(styleId1).toBeDefined();
      expect(styleId2).toBeDefined();

      const styleData = await (wb as any).zipCache.get("xl/styles.xml");
      const xf0 = styleData.data.styleSheet.cellXfs[0].xf[parseInt(styleId0!, 10)];
      const xf1 = styleData.data.styleSheet.cellXfs[0].xf[parseInt(styleId1!, 10)];
      const xf2 = styleData.data.styleSheet.cellXfs[0].xf[parseInt(styleId2!, 10)];

      expect(xf0.$.numFmtId).not.toBe(xf1.$.numFmtId);
      expect(xf1.$.numFmtId).not.toBe(xf2.$.numFmtId);
      expect(xf0.$.numFmtId).not.toBe(xf2.$.numFmtId);

      expect(styleData.getNumFmtCode(xf0.$.numFmtId)).toBe("0.000000");
      expect(styleData.getNumFmtCode(xf1.$.numFmtId)).toBe("#,##0.00");
      expect(styleData.getNumFmtCode(xf2.$.numFmtId)).toBe("0.00%");
    });

    it("왕복 변환 후 커스텀 formatCode 보존", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(1.23456789);
      await ws.cell(0, 0).setStyle({ numberFormatCode: "0.000000" });

      const bytes = await wb.toBytes();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet("Test");
      const styleId = await ws2.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();

      const styleData2 = await (wb2 as any).zipCache.get("xl/styles.xml");
      const xf = styleData2.data.styleSheet.cellXfs[0].xf[parseInt(styleId!, 10)];
      expect(styleData2.getNumFmtCode(xf.$.numFmtId)).toBe("0.000000");
    });

    it("기존 스타일에 커스텀 formatCode 추가 시 기존 속성 보존", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");

      await ws.cell(0, 0).setValue(1.23456789);
      await ws.cell(0, 0).setStyle({ background: "00FF0000" });
      await ws.cell(0, 0).setStyle({ numberFormatCode: "0.000000" });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();

      const styleData = await (wb as any).zipCache.get("xl/styles.xml");
      const xf = styleData.data.styleSheet.cellXfs[0].xf[parseInt(styleId!, 10)];

      expect(xf.$.fillId).toBeDefined();
      const fill = styleData.data.styleSheet.fills[0].fill[parseInt(xf.$.fillId, 10)];
      expect(fill.patternFill[0].fgColor[0].$.rgb).toBe("00FF0000");

      expect(xf.$.applyNumberFormat).toBe("1");
      expect(styleData.getNumFmtCode(xf.$.numFmtId)).toBe("0.000000");
    });
  });
});

describe("ExcelCellData type narrowing", () => {
  it("should type cell type field as ExcelCellType", () => {
    const cellData: ExcelCellData = {
      $: { r: "A1", t: "s" },
      v: ["test"],
    };

    const cellType: ExcelCellType | undefined = cellData.$.t;
    expect(cellType).toBe("s");

    // This should compile: no cast needed
    expect(["s", "b", "str", "n", "inlineStr", "e", undefined].includes(cellData.$.t)).toBe(true);
  });
});
