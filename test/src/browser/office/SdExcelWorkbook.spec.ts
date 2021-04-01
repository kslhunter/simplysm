import { SdExcelWorkbook } from "@simplysm/sd-office";

describe("(browser) excel.SdExcelWorkbook", () => {
  it("속도테스트", async () => {
    const fileUrl = require("./test-assets/TEST.xlsx");
    const res = await fetch(fileUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    await SdExcelWorkbook.loadAsync(buffer);
  });
});