import {TimeoutError, Wait} from "@simplysm/sd-core-common";
import {expect} from "chai";

describe("(common) core.utils.Wait", () => {
  it("특정 시간을 기다릴 수 있다.", async () => {
    const prevTick = new Date().getTime();
    await Wait.time(50);
    const nextTick = new Date().getTime();
    expect(nextTick - prevTick)
      .to.least(40)
      .and
      .to.most(100);
  });

  it("특정 함수의 반환값이 true 가 될때까지 기다릴 수 있다.", async () => {
    const prevTick = Date.now();
    await Wait.true(() => Date.now() > prevTick + 30);
    expect(Date.now()).to.least(prevTick + 30);
  });

  it("반환 true 를 기다릴때, 체크 주기를 설정할 수 있다.", async () => {
    const prevTick = Date.now();
    await Wait.true(() => Date.now() > prevTick + 10, 40);
    expect(Date.now()).to.least(prevTick + 40);
  });

  it("반환 true 를 기다릴때, timeout 시간을 설정할 수 있으며, 해당 시간이 다 지나면 타임아웃 오류가 발생한다.", async () => {
    const prevTick = new Date().getTime();
    try {
      await Wait.true(() => false, 10, 50);
      expect.fail("오류가 발생해야 합니다.");
    }
    catch (err) {
      const nextTick = new Date().getTime();
      expect(nextTick - prevTick).to.most(100);
      expect(err).to.instanceOf(TimeoutError);
    }
  });
});