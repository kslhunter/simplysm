import {TimeoutError, Wait} from "@simplysm/sd-core-common";
import {expect} from "chai";

describe("core.util.Wait", () => {
  it("특정 시간을 기다릴 수 있다.", async () => {
    const prevTick = new Date().getTime();
    await Wait.time(300);
    const nextTick = new Date().getTime();
    expect(nextTick - prevTick)
      .to.least(250)
      .and
      .to.most(350);
  });

  it("특정 함수의 반환값이 true 가 될때까지 기다릴 수 있다.", async () => {
    const prevTick = Date.now();
    await Wait.true(() => Date.now() > prevTick + 300);
    expect(Date.now()).to.least(prevTick + 300);
  });

  it("반환 true 를 기다릴때, 체크 주기를 설정할 수 있다.", async () => {
    const prevTick = Date.now();
    await Wait.true(() => Date.now() > prevTick + 100, 400);
    expect(Date.now()).to.least(prevTick + 400);
  });

  it("반환 true 를 기다릴때, timeout 시간을 설정할 수 있으며, 해당 시간이 다 지나면 타임아웃 오류가 발생한다.", (done) => {
    Wait.true(() => false, undefined, 1000)
      .then(() => {
        expect.fail("오류가 발생해야 합니다.");
      })
      .catch((err) => {
        expect(err).to.instanceOf(TimeoutError);
        done();
      });
  });
});