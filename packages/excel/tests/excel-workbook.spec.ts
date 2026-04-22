import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";
import type { Bytes } from "@simplysm/core-common";

describe("ExcelWorkbook", () => {
  describe("빈 워크북 생성", () => {
    it("워크시트 생성 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("TestSheet");

      expect(ws).toBeDefined();
      const name = await ws.getName();
      expect(name).toBe("TestSheet");
    });

    it("복수 워크시트 생성 가능", async () => {
      const wb = new ExcelWorkbook();
      await wb.addWorksheet("Sheet1");
      await wb.addWorksheet("Sheet2");
      await wb.addWorksheet("Sheet3");

      const names = await wb.getWorksheetNames();
      expect(names).toEqual(["Sheet1", "Sheet2", "Sheet3"]);
    });

    it("시트명의 금지 문자는 제거된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("보고서/2026:v1*?");

      const name = await ws.getName();
      expect(name).toBe("보고서2026v1");
    });

    it("시트명이 전부 금지 문자이면 'Sheet'로 대체된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("[*?]");

      const name = await ws.getName();
      expect(name).toBe("Sheet");
    });
  });

  describe("워크시트 접근", () => {
    it("인덱스로 워크시트 가져오기 가능", async () => {
      const wb = new ExcelWorkbook();
      await wb.addWorksheet("First");
      await wb.addWorksheet("Second");

      const ws = await wb.getWorksheet(1);
      const name = await ws.getName();
      expect(name).toBe("Second");
    });

    it("이름으로 워크시트 가져오기 가능", async () => {
      const wb = new ExcelWorkbook();
      await wb.addWorksheet("MySheet");

      const ws = await wb.getWorksheet("MySheet");
      const name = await ws.getName();
      expect(name).toBe("MySheet");
    });

    it("존재하지 않는 시트 접근 시 오류", async () => {
      const wb = new ExcelWorkbook();
      await wb.addWorksheet("Sheet1");

      await expect(wb.getWorksheet("NotExist")).rejects.toThrow();
      await expect(wb.getWorksheet(10)).rejects.toThrow();
    });
  });

  describe("Bytes/Blob 내보내기", () => {
    it("Bytes로 내보내기 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");
      await ws.cell(0, 0).setValue("Hello");

      const bytes: Bytes = await wb.toBytes();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("Blob으로 내보내기 가능", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.addWorksheet("Test");
      await ws.cell(0, 0).setValue("Hello");

      const blob = await wb.toBlob();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe("워크북 읽기/쓰기 왕복 변환", () => {
    it("Blob에서 워크북 생성 가능", async () => {
      // First create workbook with Bytes
      const wb1 = new ExcelWorkbook();
      const ws1 = await wb1.addWorksheet("Test");
      await ws1.cell(0, 0).setValue("BlobTest");
      const bytes = await wb1.toBytes();
      await wb1.close();

      // Convert to Blob
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Read workbook from Blob
      const wb2 = new ExcelWorkbook(blob);
      const ws2 = await wb2.getWorksheet(0);
      const val = await ws2.cell(0, 0).getValue();

      expect(val).toBe("BlobTest");
      await wb2.close();
    });

    it("생성된 워크북을 Bytes로 저장 후 다시 읽기 가능", async () => {
      // Create
      const wb1 = new ExcelWorkbook();
      const ws1 = await wb1.addWorksheet("RoundTrip");
      await ws1.cell(0, 0).setValue("TestValue");
      await ws1.cell(0, 1).setValue(12345);

      // Save
      const bytes = await wb1.toBytes();
      await wb1.close();

      // Read again
      const wb2 = new ExcelWorkbook(bytes);
      const names = await wb2.getWorksheetNames();
      expect(names).toContain("RoundTrip");

      const ws2 = await wb2.getWorksheet("RoundTrip");
      const val1 = await ws2.cell(0, 0).getValue();
      const val2 = await ws2.cell(0, 1).getValue();

      expect(val1).toBe("TestValue");
      expect(val2).toBe(12345);

      await wb2.close();
    });
  });

  describe("리소스 정리 후 오류", () => {
    it("close() 후 getWorksheetNames() 호출 시 오류", async () => {
      const wb = new ExcelWorkbook();
      await wb.addWorksheet("Test");
      await wb.close();

      await expect(wb.getWorksheetNames()).rejects.toThrow();
    });

    it("close() 후 getWorksheet() 호출 시 오류", async () => {
      const wb = new ExcelWorkbook();
      await wb.addWorksheet("Test");
      await wb.close();

      await expect(wb.getWorksheet(0)).rejects.toThrow();
    });
  });

  describe("실제 xlsx 파일 읽기", () => {
    let wb: ExcelWorkbook;

    beforeAll(async () => {
      const url = new URL("./fixtures/초기화.xlsx", import.meta.url);

      if (!("window" in globalThis)) {
        const fsModule = "node:fs";
        const urlModule = "node:url";
        const fs = await import(fsModule);
        const { fileURLToPath } = await import(urlModule);
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

    it("워크시트 이름 읽기 가능", async () => {
      const names = await wb.getWorksheetNames();
      expect(names).toEqual(["권한그룹", "권한그룹권한", "직원"]);
    });

    it("권한 그룹 시트 데이터 읽기 가능", async () => {
      const ws = await wb.getWorksheet("권한그룹");
      const data = await ws.getDataTable();
      expect(data).toEqual([
        { "ID": 1, "명칭": "관리자" },
      ]);
    });

    it("권한 그룹 권한 시트 데이터 읽기 가능", async () => {
      const ws = await wb.getWorksheet("권한그룹권한");
      const data = await ws.getDataTable();
      expect(data).toEqual([
        { "권한그룹.ID": 1, "코드": "ALL", "값": true },
      ]);
    });

    it("직원 시트 데이터 읽기 가능", async () => {
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
