import {describe} from "mocha";
import * as path from "path";
import {ExcelWorkbook} from "@simplism/excel";
import * as assert from "assert";
import * as fs from "fs-extra";
import * as mime from "mime";

describe("FtpStorage", () => {
  it("'JSON'을 엑셀 파일로 쓸 수 있다.", async () => {
    const wb = new ExcelWorkbook();
    const ws = wb.createWorksheet("사원");
    ws.setData([
      {
        "정수": 1,
        "문자열": "관리자",
        "여/부": true
      }
    ]);
    const filePath = path.resolve(__dirname, "테스트1.xlsx");
    wb.download(filePath);

    assert.strictEqual(fs.existsSync(filePath), true);
    fs.removeSync(filePath);
  });

  it("엑셀 파일을 'JSON'으로 읽을 수 있다.", async () => {
    const filePath = path.resolve(__dirname, "테스트.xlsx");
    const wb = await ExcelWorkbook.loadAsync(new File([fs.readFileSync(filePath)], "테스트.xlsx", {
      type: mime.getType(filePath) || ""
    }));
    const excelItems = wb.json["테스트"];

    assert.deepStrictEqual(excelItems, [
      {
        "정수": "1",
        "문자열": "관리자",
        "여/부": "TRUE"
      }
    ]);
  });
});
