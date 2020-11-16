import { expect } from "chai";
import { Time } from "@simplysm/sd-core-common";

describe("(common) core.types.Time", () => {
  it("현재의 시간 객체를 생성할 수 있다.", () => {
    const t = new Time();
    expect(t.tick).to.least(1000);
  });

  it("hour, minute, second, millisecond 을 통해 생성할 수 있으며, 해당 값들을 추가로 설정하거나, 가져올 수 있다.", () => {
    const t = new Time(3, 30, 28, 222);

    expect(t.hour).to.equal(3);
    expect(t.minute).to.equal(30);
    expect(t.second).to.equal(28);
    expect(t.millisecond).to.equal(222);

    //값 변경
    t.hour = 4;
    expect(t.hour).to.be.equal(4);

    t.minute = 40;
    expect(t.minute).to.be.equal(40);

    t.second = 32;
    expect(t.second).to.be.equal(32);

    t.millisecond = 333;
    expect(t.millisecond).to.be.equal(333);
  });

  it("tick을 통해 생성할 수 있으며, 설정하거나, 조회할 수 있다. 일자 이상의 값은 tick에서 제외된다.", () => {
    const tick = Date.now();
    const t = new Time(tick);
    expect(t.tick).to.equal(tick % (24 * 60 * 60 * 1000));

    t.tick = tick + 3000;
    expect(t.tick).to.equal((tick + 3000) % (24 * 60 * 60 * 1000));
  });

  describe("문자열을 전환하여 생성할 수 있다", () => {
    it("tt hh:mm:ss.fff", () => {
      const t = Time.parse("오후 03:30:28.222");
      expect(t.hour).to.equal(3 + 12);
      expect(t.minute).to.equal(30);
      expect(t.second).to.equal(28);
      expect(t.millisecond).to.equal(222);
    });

    it("hh:mm:ss.fff", () => {
      const t = Time.parse("03:30:28.222");
      expect(t.hour).to.equal(3);
      expect(t.minute).to.equal(30);
      expect(t.second).to.equal(28);
      expect(t.millisecond).to.equal(222);
    });

    it("tt hh:mm:ss", () => {
      const t = Time.parse("오후 03:30:28");
      expect(t.hour).to.equal(3 + 12);
      expect(t.minute).to.equal(30);
      expect(t.second).to.equal(28);
      expect(t.millisecond).to.equal(0);
    });

    it("hh:mm:ss", () => {
      const t = Time.parse("03:30:28");
      expect(t.hour).to.equal(3);
      expect(t.minute).to.equal(30);
      expect(t.second).to.equal(28);
      expect(t.millisecond).to.equal(0);
    });
  });

  it("시간등을 변경, 추가하는 작업을 체인 형태로 처리할 수 있다. 이 경우, 기존의 데이터는 변경되지 않는다.", () => {
    const t1 = new Time(3, 30, 28, 222);
    const t2 = t1.setHour(4)
      .setMinute(31)
      .setSecond(29)
      .setMillisecond(223);
    const t3 = t2.addHours(4)
      .addMinutes(5)
      .addSeconds(6)
      .addMilliseconds(7);

    expect(t1.hour).to.equal(3);
    expect(t1.minute).to.equal(30);
    expect(t1.second).to.equal(28);
    expect(t1.millisecond).to.equal(222);

    expect(t2.hour).to.equal(4);
    expect(t2.minute).to.equal(31);
    expect(t2.second).to.equal(29);
    expect(t2.millisecond).to.equal(223);

    expect(t3.hour).to.equal(8);
    expect(t3.minute).to.equal(36);
    expect(t3.second).to.equal(35);
    expect(t3.millisecond).to.equal(230);
  });

  it("각종 규칙문자를 활용하여, 문자열로 전환 할 수 있다.", () => {
    const t = new Time(14, 5, 5, 160);
    expect(
      t.toFormatString(
        "tt " +
        "hh " +
        "h " +
        "HH " +
        "H " +
        "mm " +
        "m " +
        "ss " +
        "s " +
        "fff " +
        "ff " +
        "f "
      ),
      "02 " +
      "2 " +
      "14 " +
      "14 " +
      "05 " +
      "5 " +
      "06 " +
      "6 " +
      "160 " +
      "16 " +
      "1 "
    );
  });

  it("규칙없이 문자열 변환시, \"HH:mm:ss.fff\"형식의 문자열이 반환된다.", () => {
    const t = new Time(14, 5, 5, 160);
    expect(t.toString(), "14:05:50.160");
  });
});