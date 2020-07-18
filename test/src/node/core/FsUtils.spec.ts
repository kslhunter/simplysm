import { FsUtils } from "@simplysm/sd-core-node";
import * as path from "path";
import { expect } from "chai";

describe("(node) core.FsUtils", () => {
  describe("getMd5", () => {
    it("특정 파일의 md5 값을 가져올 수 있다.", async () => {
      expect(
        await FsUtils.getMd5Async(path.resolve(__dirname, "FsUtilsTestDir", "getMd5.txt"))
      ).to.equal("827ccb0eea8a706c4c34a16891f84e7b");
    });
  });

  describe("globAsync", () => {
    it("특정 폴더내의 파일 목록을 가져올 수 있다.", async () => {
      expect(
        (
          await FsUtils.globAsync(path.resolve(__dirname, "FsUtilsTestDir", "*"))
        ).map(item => path.relative(path.resolve(__dirname, "FsUtilsTestDir"), item))
      ).to.deep.equal([
        "getMd5.txt"
      ]);
    });
  });
});
