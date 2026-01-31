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

    it("매우 큰 숫자를 처리할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // MAX_SAFE_INTEGER 이하의 큰 숫자
      const bigNumber = Number.MAX_SAFE_INTEGER;
      await ws.cell(0, 0).setVal(bigNumber);

      const val = await ws.cell(0, 0).getVal();
      expect(val).toBe(bigNumber);
    });

    it("매우 작은 소수를 처리할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // Excel이 처리 가능한 정밀도 범위 내의 작은 소수
      const smallDecimal = 0.0001;
      await ws.cell(0, 0).setVal(smallDecimal);

      const val = await ws.cell(0, 0).getVal();
      expect(val).toBeCloseTo(smallDecimal, 6);
    });

    it("지원되지 않는 타입을 설정하면 에러 발생", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

       
      await expect(ws.cell(0, 0).setVal({} as any)).rejects.toThrow("지원되지 않는 타입");
       
      await expect(ws.cell(0, 1).setVal([] as any)).rejects.toThrow("지원되지 않는 타입");
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

    it("DateOnly 값이 라운드트립 후에도 유지된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const date = new DateOnly(2024, 6, 15);
      await ws.cell(0, 0).setVal(date);

      const bytes = await wb.getBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(DateOnly);
      expect((val as DateOnly).year).toBe(2024);
      expect((val as DateOnly).month).toBe(6);
      expect((val as DateOnly).day).toBe(15);
      await wb2.close();
    });

    it("DateTime 값이 라운드트립 후에도 유지된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const dateTime = new DateTime(2024, 6, 15, 14, 30, 45);
      await ws.cell(0, 0).setVal(dateTime);

      const bytes = await wb.getBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(DateTime);
      expect((val as DateTime).year).toBe(2024);
      expect((val as DateTime).month).toBe(6);
      expect((val as DateTime).day).toBe(15);
      expect((val as DateTime).hour).toBe(14);
      expect((val as DateTime).minute).toBe(30);
      expect((val as DateTime).second).toBe(45);
      await wb2.close();
    });

    it("Time 값이 라운드트립 후에도 유지된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const time = new Time(14, 30, 45);
      await ws.cell(0, 0).setVal(time);

      const bytes = await wb.getBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet(0);

      const val = await ws2.cell(0, 0).getVal();
      expect(val).toBeInstanceOf(Time);
      expect((val as Time).hour).toBe(14);
      expect((val as Time).minute).toBe(30);
      expect((val as Time).second).toBe(45);
      await wb2.close();
    });
  });

  describe("수식", () => {
    it("수식을 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(10);
      await ws.cell(0, 1).setVal(20);
      await ws.cell(0, 2).setFormula("A1+B1");

      // 수식 직접 검증
      const formula = await ws.cell(0, 2).getFormula();
      expect(formula).toBe("A1+B1");

      // 라운드트립으로도 검증
      const buffer = await wb.getBytes();

      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);
      // 수식은 있지만 값은 Excel에서 계산해야 함
      expect(ws2).toBeDefined();
    });

    it("수식이 라운드트립 후에도 유지된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal(10);
      await ws.cell(0, 1).setVal(20);
      await ws.cell(0, 2).setFormula("SUM(A1:B1)");

      const buffer = await wb.getBytes();
      await wb.close();

      const wb2 = new ExcelWorkbook(buffer);
      const ws2 = await wb2.getWorksheet(0);

      // 수식 문자열이 저장되었는지 직접 검증
      const formula = await ws2.cell(0, 2).getFormula();
      expect(formula).toBe("SUM(A1:B1)");
      await wb2.close();
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

    it("겹치는 범위로 병합 시도 시 에러 발생", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).merge(2, 2); // A1:B2 병합

      // 겹치는 범위(B2:C3)로 병합 시도
      await expect(ws.cell(1, 1).merge(2, 2)).rejects.toThrow("병합 셀이 기존 병합 범위");
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

    it("설정한 스타일이 라운드트립 후에도 유지된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // 다양한 스타일 설정
      await ws.cell(0, 0).setVal("Styled");
      await ws.cell(0, 0).setStyle({
        background: "00FF0000", // 빨간색
        border: ["left", "right", "top", "bottom"],
        horizontalAlign: "center",
        verticalAlign: "top",
      });

      const bytes = await wb.getBytes();

      // 라운드트립 후 스타일 확인
      const wb2 = new ExcelWorkbook(bytes);
      const ws2 = await wb2.getWorksheet("Test");

      // 값 확인
      const val = await ws2.cell(0, 0).getVal();
      expect(val).toBe("Styled");

      // 스타일 ID가 존재하는지 확인
      const styleId = await ws2.cell(0, 0).getStyleId();
      expect(styleId).toBeDefined();

      // XML 레벨에서 스타일 데이터 확인
      const styleData = (await (wb2 as any).zipCache.get("xl/styles.xml"));
      const styleIdNum = parseInt(styleId!, 10);
      const xf = styleData.data.styleSheet.cellXfs[0].xf[styleIdNum];

      // 배경색 확인
      expect(xf.$.fillId).toBeDefined();
      const fillId = parseInt(xf.$.fillId, 10);
      const fill = styleData.data.styleSheet.fills[0].fill[fillId];
      expect(fill.patternFill[0].fgColor[0].$.rgb).toBe("00FF0000");

      // 테두리 확인
      expect(xf.$.borderId).toBeDefined();
      const borderId = parseInt(xf.$.borderId, 10);
      const border = styleData.data.styleSheet.borders[0].border[borderId];
      expect(border.left).toBeDefined();
      expect(border.right).toBeDefined();
      expect(border.top).toBeDefined();
      expect(border.bottom).toBeDefined();

      // 정렬 확인
      expect(xf.alignment).toBeDefined();
      expect(xf.alignment[0].$.horizontal).toBe("center");
      expect(xf.alignment[0].$.vertical).toBe("top");
    });
  });
});
