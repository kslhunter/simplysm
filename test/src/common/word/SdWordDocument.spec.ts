import { FsUtil } from "@simplysm/sd-core-node";
import path from "path";
import { fileURLToPath } from "url";
import { SdWordDocument } from "@simplysm/sd-word/src/SdWordDocument";
import { expect } from "chai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("(node) excel.SdWordDocument", () => {
  it("새파일", async () => {
    const doc = SdWordDocument.create();
    const buffer = await doc.getBufferAsync();
    await FsUtil.writeFileAsync(path.resolve(__dirname, ".output/새파일.docx"), buffer);
  });

  it("미리만든파일", async () => {
    const buffer = await FsUtil.readFileBufferAsync(path.resolve(__dirname, "SdWordDocumentTestDir/미리만든파일.docx"));
    const doc = await SdWordDocument.loadAsync(buffer);

    // 블록 -> 값 가져오기
    const r1b1Text = await doc.paragraph(0).block(0).getValAsync();
    expect(r1b1Text).equals("가나");

    const r1b2Text = await doc.paragraph(0).block(1).getValAsync();
    expect(r1b2Text).equals("다라");

    const r1b3Text = await doc.paragraph(0).block(2).getValAsync();
    expect(r1b3Text).equals("마바사");

    const r2b1Text = await doc.paragraph(1).block(0).getValAsync();
    expect(r2b1Text).equals("아자차카타");

    const r2b2Text = await doc.paragraph(1).block(1).getValAsync();
    expect(r2b2Text).equals("파하");

    // 블록 -> 값 입력
    await doc.paragraph(0).block(0).setValAsync("가가나나");
    await doc.paragraph(0).block(3).setValAsync("AAA");

    // 블록 -> 삭제
    await doc.paragraph(0).block(1).removeAsync();
    expect(await doc.paragraph(0).block(1).getValAsync()).equals("마바사");

    // 단락 -> 블록 추가
    await doc.paragraph(0).createBlockAsync(1, "BBB");
    expect(await doc.paragraph(0).block(1).getValAsync()).equals("BBB");

    // 단락 -> 블록 삭제
    await doc.paragraph(0).removeBlockAsync(0);
    expect(await doc.paragraph(0).block(0).getValAsync()).equals("BBB");

    const buffer2 = await doc.getBufferAsync();
    await FsUtil.writeFileAsync(path.resolve(__dirname, ".output/새파일2.docx"), buffer2);
  });
});
