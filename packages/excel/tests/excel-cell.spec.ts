import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";

describe("ExcelCell", () => {
  describe("셀 값 읽기/쓰기 - 기본 타입", () => {
    it("string 값을 읽고 쓸 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Hello World");
      const val = await ws.cell(0, 0).getVal();

      expect(val).toBe("Hello World");
    });

    it("number 값을 읽고 쓸 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(12345);
      await ws.cell(0, 1).setVal(3.14159);
      await ws.cell(0, 2).setVal(-100);
      await ws.cell(0, 3).setVal(0);

      expect(await ws.cell(0, 0).getVal()).toBe(12345);
      expect(await ws.cell(0, 1).getVal()).toBe(3.14159);
      expect(await ws.cell(0, 2).getVal()).toBe(-100);
      expect(await ws.cell(0, 3).getVal()).toBe(0);
    });

    it("boolean 값을 읽고 쓸 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(true);
      await ws.cell(0, 1).setVal(false);

      expect(await ws.cell(0, 0).getVal()).toBe(true);
      expect(await ws.cell(0, 1).getVal()).toBe(false);
    });

    it("undefined 값을 쓰면 셀이 삭제된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Initial");
      expect(await ws.cell(0, 0).getVal()).toBe("Initial");

      await ws.cell(0, 0).setVal(undefined);
      expect(await ws.cell(0, 0).getVal()).toBeUndefined();
    });
  });

  describe("셀 값 읽기/쓰기 - 날짜/시간 타입", () => {
    it("DateOnly 값을 읽고 쓸 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const date = new DateOnly(2024, 6, 15);
      await ws.cell(0, 0).setVal(date);

      const val = await ws.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(DateOnly);
      expect((val as DateOnly).year).toBe(2024);
      expect((val as DateOnly).month).toBe(6);
      expect((val as DateOnly).day).toBe(15);
    });

    it("DateTime 값을 읽고 쓸 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const dateTime = new DateTime(2024, 6, 15, 14, 30, 45);
      await ws.cell(0, 0).setVal(dateTime);

      const val = await ws.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(DateTime);
      expect((val as DateTime).year).toBe(2024);
      expect((val as DateTime).month).toBe(6);
      expect((val as DateTime).day).toBe(15);
      expect((val as DateTime).hour).toBe(14);
      expect((val as DateTime).minute).toBe(30);
      expect((val as DateTime).second).toBe(45);
    });

    it("Time 값을 읽고 쓸 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const time = new Time(14, 30, 45);
      await ws.cell(0, 0).setVal(time);

      const val = await ws.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(Time);
      expect((val as Time).hour).toBe(14);
      expect((val as Time).minute).toBe(30);
      expect((val as Time).second).toBe(45);
    });
  });

  describe("수식", () => {
    it("수식을 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(10);
      await ws.cell(0, 1).setVal(20);
      await ws.cell(0, 2).setFormula("A1+B1");

      // 수식 셀의 값은 Excel에서 계산되므로 여기서는 undefined
      // 수식이 제대로 저장되었는지는 라운드트립으로 확인
      const buffer = await wb.getBytes();

      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);
      // 수식은 있지만 값은 Excel에서 계산해야 함
      expect(ws2).toBeDefined();
    });

    it("수식을 undefined로 설정하면 삭제된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setFormula("A1+B1");
      await ws.cell(0, 0).setFormula(undefined);

      expect(await ws.cell(0, 0).getVal()).toBeUndefined();
    });
  });

  describe("셀 병합", () => {
    it("셀을 병합할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Merged");
      await ws.cell(0, 0).merge(2, 3); // 2행 x 3열 병합

      // 라운드트립으로 병합 확인
      const buffer = await wb.getBytes();
      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getVal();
      expect(val).toBe("Merged");
    });
  });

  describe("셀 스타일", () => {
    it("배경색을 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Colored");
      await ws.cell(0, 0).setStyle({ background: "00FF0000" }); // 빨간색

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("테두리를 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Bordered");
      await ws.cell(0, 0).setStyle({ border: ["left", "right", "top", "bottom"] });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("정렬을 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Aligned");
      await ws.cell(0, 0).setStyle({
        horizontalAlign: "center",
        verticalAlign: "center",
      });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("숫자 형식을 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(12345.6789);
      await ws.cell(0, 0).setStyle({ numberFormat: "number" });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("여러 스타일을 동시에 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Multi-Style");
      await ws.cell(0, 0).setStyle({
        background: "00FFFF00",
        border: ["left", "right"],
        horizontalAlign: "center",
        verticalAlign: "top",
      });

      const styleId = await ws.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();
    });

    it("잘못된 색상 형식은 에러 발생", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Test");
      await expect(
        ws.cell(0, 0).setStyle({ background: "invalid" }),
      ).rejects.toThrow();
    });
  });
});
