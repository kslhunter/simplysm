import {expect} from "chai";
import {Uuid} from "@simplysm/sd-core-common";

describe("core.type.Uuid", () => {
  it("새로운 유니크한 아이디를 포함한 객체를 생성할 수 있다.", () => {
    const uuid1 = Uuid.new();
    const uuid2 = Uuid.new();
    expect(uuid1.toString()).not.equal(uuid2.toString());
  });

  it("객체를 문자열로 변환할 수 있다.", () => {
    const uuid = Uuid.new();
    expect(uuid.toString()).to.match(/^[0-9a-z]{8}-[0-9a-z]{4}-4[0-9a-z]{3}-[0-9a-z]{4}-[0-9a-z]{12}$/);
  });
});