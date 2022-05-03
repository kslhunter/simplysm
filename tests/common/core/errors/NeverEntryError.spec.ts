import { expect } from "chai";
import { NeverEntryError } from "@simplysm/sd-core-common";

describe("(common) core.errors.NeverEntryError", () => {
  it("절대 진입할 수 없는 코드로 진입했다는 오류를 표시할 수 있으며, 생성자에 메시지를 입력하여, 부가적인 메시지를 추가할 수 있다.", () => {
    expect(() => {
      // eslint-disable-next-line @simplysm/ts-no-throw-not-implement-error
      throw new NeverEntryError("에러");
    }).to.throw("절대 진입될 수 없는것으로 판단된 코드에 진입되었습니다: 에러");
  });
});
