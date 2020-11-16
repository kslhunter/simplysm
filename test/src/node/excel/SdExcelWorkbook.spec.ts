/* eslint-disable no-console */

import { SdExcelWorkbook } from "@simplysm/sd-excel";
import { FsUtil } from "@simplysm/sd-core-node";
import * as path from "path";

describe("(node) excel.SdExcelWorkbook", () => {
  it("속도테스트(LARGE ROW)", async () => {
    console.log(1);
    const buffer = await FsUtil.readFileBufferAsync(path.resolve(__dirname, "test-assets/TEST_ROW.xlsx"));
    console.log(2);
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    console.log(3);

    console.log(wb.json);
  });

  it("속도테스트(LARGE COL)", async () => {
    console.log(1);
    const buffer = await FsUtil.readFileBufferAsync(path.resolve(__dirname, "test-assets/TEST_COL.xlsx"));
    console.log(2);
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    console.log(3);

    console.log(wb.json);
  });
});