/* eslint-disable no-console */

import { SdExcelWorkbook } from "@simplysm/sd-excel";
import { FsUtils } from "@simplysm/sd-core-node";
import * as path from "path";

describe("(node) excel.SdExcelWorkbook", () => {
  it("속도테스트(LARGE ROW)", async () => {
    console.log(1);
    const buffer = await FsUtils.readFileBufferAsync(path.resolve(__dirname, "test-assets/TEST_ROW.xlsx"));
    console.log(2);
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    console.log(3);

    console.log(wb.json);
  });
  it("속도테스트(LARGE COL)", async () => {
    console.log(1);
    const buffer = await FsUtils.readFileBufferAsync(path.resolve(__dirname, "test-assets/TEST_COL.xlsx"));
    console.log(2);
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    console.log(3);

    console.log(wb.json);
  });

  it("(fix) 파일읽기", async () => {
    const buffer = await FsUtils.readFileBufferAsync(path.resolve(__dirname, "test-assets/WE02 (1).xlsx"));
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    console.log(wb.json);
  });

  it("(fix) 파일읽기2", async () => {
    const buffer = await FsUtils.readFileBufferAsync(path.resolve(__dirname, "test-assets/WE02.xlsx"));
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    console.log(wb.json);
  });
});