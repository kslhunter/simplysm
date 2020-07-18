import { FunctionUtils } from "@simplysm/sd-core-common";
import { expect } from "chai";

describe("(common) core.utils.FunctionUtils", () => {
  it("특별 함수에서 인수명 목록과, 반환 텍스트를 추출해서 반환한다.", () => {
    expect(
      FunctionUtils.parse((item, index) => [item.name, index])
    ).to.deep.equal({
      params: ["item", "index"],
      returnContent: "[item.name, index]"
    });
  });
});