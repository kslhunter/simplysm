/* eslint-disable no-console */

import { SdWordDocument } from "@simplysm/sd-office";
import { FsUtil } from "@simplysm/sd-core-node";
import * as path from "path";

describe("(node) excel.SdWordDocument", () => {
  it("파싱 테스트", async () => {
    const buffer = await FsUtil.readFileBufferAsync(path.resolve(__dirname, "test-assets/수정본.docx"));
    const doc = await SdWordDocument.loadAsync(buffer);
    doc.replaceText("{{MSDS번호}}", "000150128491295");
    doc.replaceText("{{제품명}}", "김석래");
    const newBuffer = await doc.getBufferAsync();
    await FsUtil.writeFileAsync(path.resolve(__dirname, "test-result/수정본_결과.docx"), newBuffer);
  });
});