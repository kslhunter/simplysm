import {expect} from "chai";
import {ArgumentError} from "@simplysm/sd-core-common";

describe("(common) core.errors.ArgumentError", () => {
  it("인수가 잘못되었다는 오류를 표시할 수 있으며, 생성자에 Object 를 입력하여, 인수명별 입력값를 정리하여 오류 메시지에 추가할 수 있다.", () => {
    expect(() => {
      throw new ArgumentError({aaa: "bbb", ccc: 1});
    }).to.throw("인수가 잘못되었습니다: {\"aaa\":\"bbb\",\"ccc\":1}");
  });
});