import {ExcelWorkbook} from "@simplism/excel";
import * as fs from "fs-extra";
import {Assert} from "@simplism/core";

describe("ExcelAddress", () => {
    it("엑셀 주소 파싱", async () => {
        const wb = new ExcelWorkbook();
        const ws = wb.createWorksheet("테스트");
        for (let col = 0; col < 100; col++) {
            ws.cell(0, col).value = col.toString();
            ws.cell(1, col).value = col.toString();
        }
        await wb.saveAsAsync("test.xlsx");

        try {
            const wb2 = await ExcelWorkbook.loadAsync("test.xlsx");
            Assert.equal(wb.json, wb2.json);
            fs.removeSync("test.xlsx");
        }
        catch (e) {
            fs.removeSync("test.xlsx");
            throw e;
        }
    });
});