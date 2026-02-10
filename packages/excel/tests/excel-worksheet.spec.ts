import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

describe("ExcelWorksheet", () => {
  describe("시트 이름", () => {
    it("시트 이름을 가져올 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("MySheet");

      const name = await ws.getName();
      expect(name).toBe("MySheet");
    });

    it("시트 이름을 변경할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("OldName");

      await ws.setName("NewName");
      const name = await ws.getName();
      expect(name).toBe("NewName");
    });

    it("변경한 시트 이름이 라운드트립 후에도 유지된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("OldName");
      await ws.setName("NewName");

      const bytes = await wb.getBytes();

      const wb2 = new ExcelWorkbook(bytes);
      const names = await wb2.getWorksheetNames();
      expect(names).toContain("NewName");
      expect(names).not.toContain("OldName");

      const ws2 = await wb2.getWorksheet("NewName");
      const name = await ws2.getName();
      expect(name).toBe("NewName");
    });
  });

  describe("행/열 복사", () => {
    it("행을 복사할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // 원본 행 설정
      await ws.cell(0, 0).setVal("A");
      await ws.cell(0, 1).setVal("B");
      await ws.cell(0, 2).setVal("C");

      // 행 복사
      await ws.copyRow(0, 2);

      expect(await ws.cell(2, 0).getVal()).toBe("A");
      expect(await ws.cell(2, 1).getVal()).toBe("B");
      expect(await ws.cell(2, 2).getVal()).toBe("C");
    });

    it("셀을 복사할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Original");
      await ws.copyCell({ r: 0, c: 0 }, { r: 1, c: 1 });

      expect(await ws.cell(1, 1).getVal()).toBe("Original");
    });

    it("행 스타일만 복사할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // 스타일 설정
      await ws.cell(0, 0).setVal("Styled");
      await ws.cell(0, 0).setStyle({ background: "00FF0000" });
      await ws.cell(0, 1).setVal("Also Styled");
      await ws.cell(0, 1).setStyle({ background: "0000FF00" });

      // 스타일만 복사
      await ws.copyRowStyle(0, 2);

      // 값은 복사되지 않음
      expect(await ws.cell(2, 0).getVal()).toBeUndefined();
      expect(await ws.cell(2, 1).getVal()).toBeUndefined();

      // 스타일은 복사됨
      const styleId0 = await ws.cell(0, 0).getStyleId();
      const styleId2 = await ws.cell(2, 0).getStyleId();
      expect(styleId2).toBe(styleId0);
    });

    it("행 삽입 복사를 할 수 있다 (srcR < targetR)", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Row0");
      await ws.cell(1, 0).setVal("Row1");
      await ws.cell(2, 0).setVal("Row2");

      // 0행을 1행 위치에 삽입 복사 (기존 행들이 밀림)
      await ws.insertCopyRow(0, 1);

      expect(await ws.cell(0, 0).getVal()).toBe("Row0");
      expect(await ws.cell(1, 0).getVal()).toBe("Row0"); // 복사됨
      expect(await ws.cell(2, 0).getVal()).toBe("Row1"); // 밀림
      expect(await ws.cell(3, 0).getVal()).toBe("Row2"); // 밀림
    });

    it("행 삽입 복사를 할 수 있다 (srcR > targetR)", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Row0");
      await ws.cell(1, 0).setVal("Row1");
      await ws.cell(2, 0).setVal("Row2");
      await ws.cell(3, 0).setVal("Row3");

      // 2행을 1행 위치에 삽입 복사 (기존 행들이 밀림)
      await ws.insertCopyRow(2, 1);

      expect(await ws.cell(0, 0).getVal()).toBe("Row0");
      expect(await ws.cell(1, 0).getVal()).toBe("Row2"); // 원래 Row2 복사됨
      expect(await ws.cell(2, 0).getVal()).toBe("Row1"); // 밀림
      expect(await ws.cell(3, 0).getVal()).toBe("Row2"); // 밀림 (원래 Row2)
      expect(await ws.cell(4, 0).getVal()).toBe("Row3"); // 밀림
    });

    it("행 삽입 복사를 할 수 있다 (srcR == targetR)", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Row0");
      await ws.cell(1, 0).setVal("Row1");
      await ws.cell(2, 0).setVal("Row2");

      // 1행을 1행 위치에 삽입 복사 (자기 자신을 복사)
      await ws.insertCopyRow(1, 1);

      expect(await ws.cell(0, 0).getVal()).toBe("Row0");
      expect(await ws.cell(1, 0).getVal()).toBe("Row1"); // 원래 Row1 복사됨
      expect(await ws.cell(2, 0).getVal()).toBe("Row1"); // 밀림 (원래 Row1)
      expect(await ws.cell(3, 0).getVal()).toBe("Row2"); // 밀림
    });
  });

  describe("범위 및 셀 접근", () => {
    it("데이터 범위를 가져올 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("A");
      await ws.cell(2, 3).setVal("D");

      const range = await ws.getRange();
      expect(range.s.r).toBe(0);
      expect(range.s.c).toBe(0);
      expect(range.e.r).toBe(2);
      expect(range.e.c).toBe(3);
    });

    it("모든 셀을 가져올 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("A");
      await ws.cell(0, 1).setVal("B");
      await ws.cell(1, 0).setVal("C");
      await ws.cell(1, 1).setVal("D");

      const cells = await ws.getCells();
      expect(cells.length).toBe(2);
      expect(cells[0].length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("데이터 테이블", () => {
    it("데이터 테이블을 가져올 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // 헤더
      await ws.cell(0, 0).setVal("Name");
      await ws.cell(0, 1).setVal("Age");
      // 데이터
      await ws.cell(1, 0).setVal("Alice");
      await ws.cell(1, 1).setVal(30);
      await ws.cell(2, 0).setVal("Bob");
      await ws.cell(2, 1).setVal(25);

      const data = await ws.getDataTable();
      expect(data.length).toBe(2);
      expect(data[0]["Name"]).toBe("Alice");
      expect(data[0]["Age"]).toBe(30);
      expect(data[1]["Name"]).toBe("Bob");
      expect(data[1]["Age"]).toBe(25);
    });

    it("특정 헤더만 필터링하여 가져올 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Name");
      await ws.cell(0, 1).setVal("Age");
      await ws.cell(0, 2).setVal("Ignore");
      await ws.cell(1, 0).setVal("Alice");
      await ws.cell(1, 1).setVal(30);
      await ws.cell(1, 2).setVal("X");

      const data = await ws.getDataTable({
        usableHeaderNameFn: (name) => name !== "Ignore",
      });

      expect(data[0]["Name"]).toBe("Alice");
      expect(data[0]["Age"]).toBe(30);
      expect(data[0]["Ignore"]).toBeUndefined();
    });

    it("데이터 매트릭스를 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const matrix = [
        ["A", "B", "C"],
        [1, 2, 3],
        [4, 5, 6],
      ];

      await ws.setDataMatrix(matrix);

      expect(await ws.cell(0, 0).getVal()).toBe("A");
      expect(await ws.cell(0, 2).getVal()).toBe("C");
      expect(await ws.cell(2, 2).getVal()).toBe(6);
    });

    it("레코드 배열을 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      const records = [
        { Name: "Alice", Age: 30 },
        { Name: "Bob", Age: 25 },
      ];

      await ws.setRecords(records);

      // 헤더 확인
      const headers = [await ws.cell(0, 0).getVal(), await ws.cell(0, 1).getVal()];
      expect(headers).toContain("Name");
      expect(headers).toContain("Age");

      // 데이터 확인 (순서는 다를 수 있음)
      const data = await ws.getDataTable();
      expect(data.length).toBe(2);
    });
  });

  describe("뷰 설정", () => {
    it("줌 레벨을 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.setZoom(85);
      // 에러 없이 설정되면 성공
    });

    it("틀 고정을 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.setFix({ r: 1 }); // 1행 고정
      await ws.setFix({ c: 2 }); // 2열 고정
      await ws.setFix({ r: 1, c: 1 }); // 1행 1열 고정
      // 에러 없이 설정되면 성공
    });
  });

  describe("열 너비", () => {
    it("열 너비를 설정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.col(0).setWidth(20);
      // 에러 없이 설정되면 성공
    });

    it("설정한 열 너비가 라운드트립 후에도 유지된다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("A1");
      await ws.col(0).setWidth(25);
      await ws.col(2).setWidth(30);

      const bytes = await wb.getBytes();

      const wb2 = new ExcelWorkbook(bytes);
      await wb2.getWorksheet("Test");

      // XML 구조에서 cols 데이터 확인
      const wsData = await (wb2 as any).zipCache.get("xl/worksheets/sheet1.xml");
      const cols = wsData.data.worksheet.cols?.[0]?.col ?? [];

      // 열 A (인덱스 0, 1-based=1)의 너비 확인
      const colA = cols.find((c: any) => c.$.min === "1" && c.$.max === "1");
      expect(colA).toBeDefined();
      expect(colA.$.width).toBe("25");

      // 열 C (인덱스 2, 1-based=3)의 너비 확인
      const colC = cols.find((c: any) => c.$.min === "3" && c.$.max === "3");
      expect(colC).toBeDefined();
      expect(colC.$.width).toBe("30");
    });
  });

  describe("열 접근", () => {
    it("열의 모든 셀을 가져올 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("A1");
      await ws.cell(1, 0).setVal("A2");
      await ws.cell(2, 0).setVal("A3");

      const cells = await ws.col(0).getCells();
      expect(cells.length).toBe(3);
      expect(await cells[0].getVal()).toBe("A1");
      expect(await cells[1].getVal()).toBe("A2");
      expect(await cells[2].getVal()).toBe("A3");
    });
  });

  describe("데이터 테이블 엣지 케이스", () => {
    it("빈 시트에서 getDataTable 호출 시 빈 배열 반환", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Empty");
      const data = await ws.getDataTable();
      expect(data).toEqual([]);
    });

    it("헤더만 있고 데이터가 없는 경우 빈 배열 반환", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");
      await ws.cell(0, 0).setVal("Header1");
      await ws.cell(0, 1).setVal("Header2");
      const data = await ws.getDataTable();
      expect(data).toEqual([]);
    });
  });

  describe("데이터 테이블 옵션", () => {
    it("headerRowIndex로 헤더 행을 지정할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      // 0행은 제목
      await ws.cell(0, 0).setVal("Title");
      // 1행이 헤더
      await ws.cell(1, 0).setVal("Name");
      await ws.cell(1, 1).setVal("Age");
      // 2행부터 데이터
      await ws.cell(2, 0).setVal("Alice");
      await ws.cell(2, 1).setVal(30);

      const data = await ws.getDataTable({ headerRowIndex: 1 });
      expect(data.length).toBe(1);
      expect(data[0]["Name"]).toBe("Alice");
      expect(data[0]["Age"]).toBe(30);
    });

    it("checkEndColIndex로 데이터 끝을 감지할 수 있다", async () => {
      const wb = new ExcelWorkbook();
      const ws = await wb.createWorksheet("Test");

      await ws.cell(0, 0).setVal("Name");
      await ws.cell(0, 1).setVal("Age");
      await ws.cell(1, 0).setVal("Alice");
      await ws.cell(1, 1).setVal(30);
      await ws.cell(2, 0).setVal("Bob");
      await ws.cell(2, 1).setVal(25);
      // 3행은 Name 열이 비어있음 → 데이터 끝
      await ws.cell(3, 1).setVal(999);

      const data = await ws.getDataTable({ checkEndColIndex: 0 });
      expect(data.length).toBe(2);
      expect(data[0]["Name"]).toBe("Alice");
      expect(data[1]["Name"]).toBe("Bob");
    });
  });
});
