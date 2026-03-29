import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

describe("SdExcelReader ESM codepage 지원", () => {
  it("레거시 인코딩 엑셀 파일 파싱 시 codepage 경고가 출력되지 않는다", async () => {
    const { SdExcelReader } = await import("../src/legacy/SdExcelReader");

    // xls (BIFF) 포맷으로 생성하여 codepage 관련 경로를 타도록 함
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["테스트", "한글데이터"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xls" });

    // console.error/warn/log를 spy해서 codepage 경고가 나오지 않는지 확인
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const reader = new SdExcelReader(Buffer.from(buffer));
    expect(reader.sheetNames).toContain("Sheet1");

    // "Codepage tables are not loaded" 경고가 출력되지 않아야 함
    const allCalls = [...warnSpy.mock.calls, ...errorSpy.mock.calls, ...logSpy.mock.calls];
    const codepageWarning = allCalls.some((args) =>
      args.some(
        (arg) => typeof arg === "string" && arg.includes("Codepage tables are not loaded"),
      ),
    );
    expect(codepageWarning).toBe(false);

    warnSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("일반 엑셀 파일이 기존과 동일하게 정상 파싱된다", async () => {
    const { SdExcelReader } = await import("../src/legacy/SdExcelReader");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Value"],
      ["test", 123],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const reader = new SdExcelReader(Buffer.from(buffer));
    expect(reader.sheetNames).toEqual(["Data"]);

    const sheet = reader.getWorkSheet("Data");
    expect(sheet).toBeDefined();
  });
});
