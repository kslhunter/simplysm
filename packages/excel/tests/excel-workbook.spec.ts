import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";
import type { Bytes } from "@simplysm/core-common";

describe("ExcelWorkbook", () => {
  describe("Creating empty workbook", () => {
    it("Can create a worksheet", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("TestSheet");

      expect(ws).toBeDefined();
      const name = await ws.getName();
      expect(name).toBe("TestSheet");
    });

    it("Can create multiple worksheets", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("Sheet1");
      await wb.createWorksheet("Sheet2");
      await wb.createWorksheet("Sheet3");

      const names = await wb.getWorksheetNames();
      expect(names).toEqual(["Sheet1", "Sheet2", "Sheet3"]);
    });
  });

  describe("Accessing worksheets", () => {
    it("Can get worksheet by index", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("First");
      await wb.createWorksheet("Second");

      const ws = await wb.getWorksheet(1);
      const name = await ws.getName();
      expect(name).toBe("Second");
    });

    it("Can get worksheet by name", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("MySheet");

      const ws = await wb.getWorksheet("MySheet");
      const name = await ws.getName();
      expect(name).toBe("MySheet");
    });

    it("Error when accessing non-existent sheet", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("Sheet1");

      await expect(wb.getWorksheet("NotExist")).rejects.toThrow();
      await expect(wb.getWorksheet(10)).rejects.toThrow();
    });
  });

  describe("Bytes/Blob export", () => {
    it("Can export as Bytes", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");
      await ws.cell(0, 0).setVal("Hello");

      const bytes: Bytes = await wb.getBytes();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("Can export as Blob", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");
      await ws.cell(0, 0).setVal("Hello");

      const blob = await wb.getBlob();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe("Workbook read/write round-trip", () => {
    it("Can create workbook from Blob", async () => {
      // First create workbook with Bytes
      const wb1 = new ExcelWorkbook();
      const ws1 = await wb1.createWorksheet("Test");
      await ws1.cell(0, 0).setVal("BlobTest");
      const bytes = await wb1.getBytes();
      await wb1.close();

      // Convert to Blob
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Read workbook from Blob
      const wb2 = new ExcelWorkbook(blob);
      const ws2 = await wb2.getWorksheet(0);
      const val = await ws2.cell(0, 0).getVal();

      expect(val).toBe("BlobTest");
      await wb2.close();
    });

    it("Can save created workbook as Bytes and read again", async () => {
      // Create
      const wb1 = new ExcelWorkbook();
      const ws1 = await wb1.createWorksheet("RoundTrip");
      await ws1.cell(0, 0).setVal("TestValue");
      await ws1.cell(0, 1).setVal(12345);

      // Save
      const bytes = await wb1.getBytes();
      await wb1.close();

      // Read again
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

  describe("Error after resource cleanup", () => {
    it("Error when calling getWorksheetNames() after close()", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("Test");
      await wb.close();

      await expect(wb.getWorksheetNames()).rejects.toThrow();
    });

    it("Error when calling createWorksheet() after close()", async () => {
      const wb = new ExcelWorkbook();
      await wb.close();

      await expect(wb.createWorksheet("New")).rejects.toThrow();
    });

    it("Error when calling getWorksheet() after close()", async () => {
      const wb = new ExcelWorkbook();
      await wb.createWorksheet("Test");
      await wb.close();

      await expect(wb.getWorksheet(0)).rejects.toThrow();
    });

    it("Error when calling getBytes() after close()", async () => {
      const wb = new ExcelWorkbook();
      await wb.close();

      await expect(wb.getBytes()).rejects.toThrow();
    });
  });

  describe("Reading real xlsx file", () => {
    let wb: ExcelWorkbook;

    beforeAll(async () => {
      const url = new URL("./fixtures/초기화.xlsx", import.meta.url);

      if (typeof globalThis.window === "undefined") {
        const fs = await import("node:fs");
        const { fileURLToPath } = await import("node:url");
        const buffer = fs.readFileSync(fileURLToPath(url));
        wb = new ExcelWorkbook(new Uint8Array(buffer));
      } else {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        wb = new ExcelWorkbook(new Uint8Array(arrayBuffer));
      }
    });

    afterAll(async () => {
      await wb.close();
    });

    it("Can read worksheet names", async () => {
      const names = await wb.getWorksheetNames();
      expect(names).toEqual(["권한그룹", "권한그룹권한", "직원"]);
    });

    it("Can read permission group sheet data", async () => {
      const ws = await wb.getWorksheet("권한그룹");
      const data = await ws.getDataTable();
      expect(data).toEqual([
        { "ID": 1, "명칭": "관리자" },
      ]);
    });

    it("Can read permission group permission sheet data", async () => {
      const ws = await wb.getWorksheet("권한그룹권한");
      const data = await ws.getDataTable();
      expect(data).toEqual([
        { "권한그룹.ID": 1, "코드": "ALL", "값": true },
      ]);
    });

    it("Can read employee sheet data", async () => {
      const ws = await wb.getWorksheet("직원");
      const data = await ws.getDataTable();
      expect(data).toEqual([
        {
          "ID": 1,
          "이름": "관리자",
          "이메일": "admin@test.com",
          "비밀번호": "1234",
          "권한그룹.ID": 1,
          "삭제": false,
        },
      ]);
    });
  });
});
