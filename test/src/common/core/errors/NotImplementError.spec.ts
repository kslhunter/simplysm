import { expect } from "chai";
import { NotImplementError } from "@simplysm/sd-core-common";

describe("(common) core.errors.NotImplementError", () => {
  it("구현되지 않았다는 오류를 표시할 수 있으며, 생성자에 메시지를 입력하여, 부가적인 메시지를 추가할 수 있다.", () => {
    expect(() => {
      // eslint-disable-next-line @simplysm/ts-no-throw-not-implement-error
      throw new NotImplementError("에러");
    }).to.throw("구현되어있지 않습니다: 에러");
  });
});