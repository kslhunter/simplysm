import { SdExcelWrapper } from "../../packages/sd-excel/src/wrap/sd-excel-wrapper";
import { DateOnly } from "@simplysm/sd-core-common";
import { FsUtils } from "@simplysm/sd-core-node";
import * as path from "node:path";

describe("sd-excel-wrapper", () => {
  it("read/write", async () => {
    const excelWrapper = new SdExcelWrapper<{
      id: number;
      name: string;
      goods: {
        name: string;
      };
      date: DateOnly;
      isDeleted: boolean;
    }>(() => ({
      id: { displayName: "ID", type: Number },
      name: { displayName: "명칭", type: String, notnull: true },
      date: { displayName: "일자", type: DateOnly },
      "goods.name": { displayName: "품목명", type: String },
      isDeleted: { displayName: "삭제", type: Boolean, notnull: true },
    }));

    const buffer = await FsUtils.readFileBufferAsync(
      path.resolve(import.meta.dirname, "wrapper.xlsx"),
    );
    const items = await excelWrapper.readAsync(buffer);
    console.log(items);

    const wb = await excelWrapper.writeAsync("wrapper2", items);
    const bufferRes = await wb.getBufferAsync();
    await FsUtils.writeFileAsync(path.resolve(import.meta.dirname, "wrapper_res.xlsx"), bufferRes);
  });
});