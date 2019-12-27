import {SdExcelWorkbook} from "./SdExcelWorkbook";
import * as fs from "fs";
import * as path from "path";
import {DateOnly} from "@simplysm/sd-core";

describe("SdExcelWorkbook", () => {
  it("엑셀 파일을 읽어 특정 셀의 데이터만 변경할 수 있다.", async () => {
    const buffer = fs.readFileSync(path.resolve(__dirname, "test/BSH-310_출하검사성적서 _ 양식.xlsx"));
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    const sheet = wb.getWorksheet(0);
    sheet.cell(5, 9).value = new DateOnly();
    const result: Buffer = await wb.getBufferAsync();
    fs.writeFileSync(path.resolve(__dirname, "test/test.result.xlsx"), result);
  });

  it("(FIX) 셀 서식이 있는경우에 numFmtId가 '0'이 들어가 생기는 오류 수정", async () => {
    const buffer = fs.readFileSync(path.resolve(__dirname, "test/stock_upload_fail.xlsx"));
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    console.log(wb.json);
  });
});