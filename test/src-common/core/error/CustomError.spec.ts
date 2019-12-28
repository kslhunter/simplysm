import {CustomError} from "@simplysm/sd-core-common";
import {expect} from "chai";

describe("core.error.CustomError", () => {
  it("특정 이름의 커스텀 에러를 만들 수 있다.  이를 사용하여 에러를 만들면, 해당 에러가 발생한 stack trace 가 새로 표시된다.", () => {
    class TestCustomError extends CustomError {
    }

    try {
      throw new TestCustomError("에러");
    }
    catch (err) {
      expect(err.name).to.equal("TestCustomError");
      expect(err.stack).to.includes("에러");
      expect(err.stack).to.includes("   at ");
    }
  });

  it("오류를 Parent, Children 으로 체인화 하여 발생시킬 수 있다. 생성자에 반드시 부모 에러를 입력해야 한다. 각 에러에 대한 stacktrace 가 Hierarchical 구조로 구분되어 표시된다.", () => {
    class TestCustomError extends CustomError {
    }

    try {
      throw new TestCustomError(new TestCustomError("111"), "222");
    }
    catch (err) {
      expect(err.message).to.equal("222 => 111");
      expect(err.stack).to.match(/222(.|\r|\n)*-- inner error stack --(.|\r|\n)*111/);
      expect(err.stack).to.match(
        new RegExp(/ {3}at(.|\r|\n)*-- inner error stack --(.|\r|\n)* {3}at/)
      );
    }
  });
});