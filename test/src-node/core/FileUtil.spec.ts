import {FileUtil} from "@simplysm/sd-core-node";
import * as path from "path";
import {expect} from "chai";

describe("(node) core.FileUtil", () => {
  describe("getMd5", () => {
    it("특정 파일의 md5 값을 가져올 수 있다.", async () => {
      expect(
        await FileUtil.getMd5(path.resolve(__dirname, "FileUtilTestDir", "getMd5.txt"))
      ).to.equal("827ccb0eea8a706c4c34a16891f84e7b");
    });
  });
});