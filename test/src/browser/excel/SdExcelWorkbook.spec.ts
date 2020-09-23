import { SdExcelWorkbook } from "@simplysm/sd-excel";

describe("(browser) excel.SdExcelWorkbook", () => {
  it("속도테스트", async () => {
    const buffer = await fetch(require("./test-assets/TEST.xlsx")).then((r: Response) => Buffer.from(r.arrayBuffer()));
    await SdExcelWorkbook.loadAsync(buffer);
  });
});