import {PropertyValidate} from "@simplysm/sd-core-common";
import {expect} from "chai";

describe("core.decorator.PropertyValidate", () => {
  it("속성의 유효성을 확인할 수 있다.", () => {
    class TestClass {
      @PropertyValidate({
        type: String,
        includes: ["1", "2"],
        notnull: true,
        validator: (item) => item !== undefined
      })
      testProp?: any;
    }

    try {
      const testObject = new TestClass();
      testObject.testProp = undefined;
    }
    catch (err) {
      expect(err.message)
        .to.includes(`"type"`).and
        .to.includes(`"includes"`).and
        .to.includes(`"notnull"`).and
        .to.includes(`"validator"`);
      return;
    }

    expect.fail("에러가 발생했어야 합니다.");
  });
});
