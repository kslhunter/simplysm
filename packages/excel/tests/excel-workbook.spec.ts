import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";
import type { Bytes } from "@simplysm/core-common";

describe("ExcelWorkbook", () => {
  describe("빈 워크북 생성", () => {
    it("워크시트를 생성할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("TestSheet");

      expect(ws).toBeDefined();
      const name = await ws.getName();
      expect(name).toBe("TestSheet");
    });

    it("여러 워크시트를 생성할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("Sheet1");
      await wb.createWorksheet("Sheet2");
      await wb.createWorksheet("Sheet3");

      const names = await wb.getWorksheetNames();
      expect(names).toEqual(["Sheet1", "Sheet2", "Sheet3"]);
    });
  });

  describe("워크시트 접근", () => {
    it("인덱스로 워크시트를 가져올 수 있다", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("First");
      await wb.createWorksheet("Second");

      const ws = await wb.getWorksheet(1);
      const name = await ws.getName();
      expect(name).toBe("Second");
    });

    it("이름으로 워크시트를 가져올 수 있다", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("MySheet");

      const ws = await wb.getWorksheet("MySheet");
      const name = await ws.getName();
      expect(name).toBe("MySheet");
    });

    it("존재하지 않는 시트 접근 시 에러", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("Sheet1");

      await expect(wb.getWorksheet("NotExist")).rejects.toThrow();
      await expect(wb.getWorksheet(10)).rejects.toThrow();
    });
  });

  describe("Bytes/Blob 출력", () => {
    it("Bytes로 출력할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");
      await ws.cell(0, 0).setVal("Hello");

      const bytes: Bytes = await wb.getBytes();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("Blob으로 출력할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");
      await ws.cell(0, 0).setVal("Hello");

      const blob = await wb.getBlob();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe("워크북 읽기/쓰기 라운드트립", () => {
    it("Blob으로 워크북을 생성할 수 있다", async () => {
      // 먼저 Bytes로 워크북 생성
      const wb1 = new ExcelWorkbook();
      const ws1 = await wb1.createWorksheet("Test");
      await ws1.cell(0, 0).setVal("BlobTest");
      const bytes = await wb1.getBytes();
      await wb1.close();

      // Blob으로 변환
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Blob으로 워크북 읽기
      const wb2 = new ExcelWorkbook(blob);
      const ws2 = await wb2.getWorksheet(0);
      const val = await ws2.cell(0, 0).getVal();

      expect(val).toBe("BlobTest");
      await wb2.close();
    });

    it("생성한 워크북을 Bytes로 저장 후 다시 읽을 수 있다", async () => {
      // 생성
      const wb1 = new ExcelWorkbook();
      const ws1 = await wb1.createWorksheet("RoundTrip");
      await ws1.cell(0, 0).setVal("TestValue");
      await ws1.cell(0, 1).setVal(12345);

      // 저장
      const bytes = await wb1.getBytes();
      await wb1.close();

      // 다시 읽기
      const wb2 = new ExcelWorkbook(bytes);
      const names = await wb2.getWorksheetNames();
      expect(names).toContain("RoundTrip");

      const ws2 = await wb2.getWorksheet("RoundTrip");
      const val1 = await ws2.cell(0, 0).getVal();
      const val2 = await ws2.cell(0, 1).getVal();

      expect(val1).toBe("TestValue");
      expect(val2).toBe(12345);

      await wb2.close();
    });
  });

  describe("리소스 해제 후 에러", () => {
    it("close() 후 getWorksheetNames() 호출 시 에러", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("Test");
      await wb.close();

      await expect(wb.getWorksheetNames()).rejects.toThrow();
    });

    it("close() 후 createWorksheet() 호출 시 에러", async () => {
      const wb = new ExcelWorkbook();
      await wb.close();

      await expect(wb.createWorksheet("New")).rejects.toThrow();
    });

    it("close() 후 getWorksheet() 호출 시 에러", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("Test");
      await wb.close();

      await expect(wb.getWorksheet(0)).rejects.toThrow();
    });

    it("close() 후 getBytes() 호출 시 에러", async () => {
      const wb = new ExcelWorkbook();
      await wb.close();

      await expect(wb.getBytes()).rejects.toThrow();
    });
  });
});
