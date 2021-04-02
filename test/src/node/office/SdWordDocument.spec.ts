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
    doc.replaceText("{{유해위험문구}}", ["H350\t\t암을 일으킬 수 있음", "H412\t장기적인 영향에 의해 수생생물에게 유해함"]);
    doc.fillTable("{{성분표}}", [
      ["이산화주석", "STANNIC DIOXIDE", "18282-10-5", "60-70"],
      ["황산 나트륨", "황산 디나트륨 염(SULFURIC ACID DISODIUM SALT)", "7757-82-6", "10-20"],
      ["비소", "-", "7440-38-2", "10-20"]
    ]);
    
    // TODO: 테이블이 아래로 내려가는 현상 xml-js 로 라이브러리 변경 검토

    const newBuffer = await doc.getBufferAsync();
    await FsUtil.writeFileAsync(path.resolve(__dirname, "test-result/수정본_결과.docx"), newBuffer);
  });
});