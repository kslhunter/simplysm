import { expect } from "chai";
import { TimeoutError } from "@simplysm/sd-core-common";

describe("(common) core.errors.TimeoutError", () => {
  it("대기시간이 초과되었다는 오류를 표시할 수 있다.", () => {
    expect(() => {
      throw new TimeoutError(3000, "에러");
    }).to.throw("대기시간이 초과되었습니다(3000ms): 에러");
  });
});