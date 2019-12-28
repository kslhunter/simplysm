import {expect} from "chai";
import {DateTime} from "@simplysm/sd-core-common";

describe("core.type.DateTime", () => {
  it("현재의 날짜+시간 객체를 생성할 수 있다.", () => {
    const dt = new DateTime();
    expect(dt.tick).to
      .to.most(Date.now() + 100)
      .and
      .to.least(Date.now() - 100);
  });

  it("year, month, day, hour, minute, second, millisecond 을 통해 생성할 수 있으며, 해당 값들을 추가로 설정하거나, 가져올 수 있다.", () => {
    const dt1 = new DateTime(2019, 2, 12);
    const dt2 = new DateTime(2019, 2, 12, 3);
    const dt3 = new DateTime(2019, 2, 12, 3, 30);
    const dt4 = new DateTime(2019, 2, 12, 3, 30, 28);
    const dt5 = new DateTime(2019, 2, 12, 3, 30, 28, 222);

    //초기값 가져오기 (체크)
    expect(dt1.year).to.equal(2019);
    expect(dt1.month).to.equal(2);
    expect(dt1.day).to.equal(12);
    expect(dt1.hour).to.equal(0);
    expect(dt1.minute).to.equal(0);
    expect(dt1.second).to.equal(0);
    expect(dt1.millisecond).to.equal(0);

    //각 DateTime 값 가져오기 (체크)
    expect(dt1.year).to.equal(2019);
    expect(dt1.month).to.equal(2);
    expect(dt1.day).to.equal(12);
    expect(dt2.hour).to.equal(3);
    expect(dt3.minute).to.equal(30);
    expect(dt4.second).to.equal(28);
    expect(dt5.millisecond).to.equal(222);

    //값 변경
    dt1.year = 2020;
    expect(dt1.year).to.be.equal(2020);

    dt1.month = 3;
    expect(dt1.month).to.be.equal(3);

    dt1.day = 20;
    expect(dt1.day).to.be.equal(20);

    dt1.hour = 4;
    expect(dt1.hour).to.be.equal(4);

    dt1.minute = 40;
    expect(dt1.minute).to.be.equal(40);

    dt1.second = 32;
    expect(dt1.second).to.be.equal(32);

    dt1.millisecond = 333;
    expect(dt1.millisecond).to.be.equal(333);
  });

  it("tick을 통해 생성할 수 있으며, 설정하거나, 조회할 수 있다.", () => {
    const tick = Date.now();
    const dt = new DateTime(tick);
    expect(dt.tick).to.equal(tick);

    dt.tick = tick + 3000;
    expect(dt.tick).to.equal(tick + 3000);
  });

  describe("문자열을 전환하여 생성할 수 있다", () => {
    it("yyyy-MM-ddTHH:mm:ss.fffzzz", () => {
      const dt = DateTime.parse("2019-02-12T03:30:28.222+05:00");
      expect(dt.year).to.equal(2019);
      expect(dt.month).to.equal(2);
      expect(dt.day).to.equal(12);
      expect(dt.hour).to.equal(3 + 4); // 한국의 TIMEZONE 은 +09:00 이므로, 입력된 TIMEZONE 과 +4 만큼 다름
      expect(dt.minute).to.equal(30);
      expect(dt.second).to.equal(28);
      expect(dt.millisecond).to.equal(222);
    });

    it("yyyy-MM-dd HH:mm:ss.fff", () => {
      const dt = DateTime.parse("2019-02-12 03:30:28");
      expect(dt.year).to.equal(2019);
      expect(dt.month).to.equal(2);
      expect(dt.day).to.equal(12);
      expect(dt.hour).to.equal(3);
      expect(dt.minute).to.equal(30);
      expect(dt.second).to.equal(28);
      expect(dt.millisecond).to.equal(0);
    });

    it("yyyy-MM-dd tt hh:mm:ss", () => {
      const dt = DateTime.parse("2019-02-12 오후 03:30:28");
      expect(dt.year).to.equal(2019);
      expect(dt.month).to.equal(2);
      expect(dt.day).to.equal(12);
      expect(dt.hour).to.equal(15);
      expect(dt.minute).to.equal(30);
      expect(dt.second).to.equal(28);
      expect(dt.millisecond).to.equal(0);
    });

    it("yyyyMMddHHmmss", () => {
      const dt = DateTime.parse("20190212033028");
      expect(dt.year).to.equal(2019);
      expect(dt.month).to.equal(2);
      expect(dt.day).to.equal(12);
      expect(dt.hour).to.equal(3);
      expect(dt.minute).to.equal(30);
      expect(dt.second).to.equal(28);
      expect(dt.millisecond).to.equal(0);
    });
  });

  it("요일을 가져올 수 있다.", () => {
    const dt1 = new DateTime(2019, 11, 10); //일
    const dt2 = new DateTime(2019, 11, 11); //월
    const dt3 = new DateTime(2019, 11, 12); //화
    const dt4 = new DateTime(2019, 11, 13); //수
    const dt5 = new DateTime(2019, 11, 14); //목
    const dt6 = new DateTime(2019, 11, 15); //금
    const dt7 = new DateTime(2019, 11, 16); //토

    expect(dt1.week).to.equal(0);
    expect(dt2.week).to.equal(1);
    expect(dt3.week).to.equal(2);
    expect(dt4.week).to.equal(3);
    expect(dt5.week).to.equal(4);
    expect(dt6.week).to.equal(5);
    expect(dt7.week).to.equal(6);
  });

  it("일자등을 변경, 추가하는 작업을 체인 형태로 처리할 수 있다. 이 경우, 기존의 데이터는 변경되지 않는다.", () => {
    const dt1 = new DateTime(2019, 2, 12, 3, 30, 28, 222);
    const dt2 = dt1.setYear(2020)
      .setMonth(3)
      .setDay(13)
      .setHour(4)
      .setMinute(31)
      .setSecond(29)
      .setMillisecond(223);
    const dt3 = dt2.addYears(1)
      .addMonths(2)
      .addDays(3)
      .addHours(4)
      .addMinutes(5)
      .addSeconds(6)
      .addMilliseconds(7);

    expect(dt1.year).to.equal(2019);
    expect(dt1.month).to.equal(2);
    expect(dt1.day).to.equal(12);
    expect(dt1.hour).to.equal(3);
    expect(dt1.minute).to.equal(30);
    expect(dt1.second).to.equal(28);
    expect(dt1.millisecond).to.equal(222);

    expect(dt2.year).to.equal(2020);
    expect(dt2.month).to.equal(3);
    expect(dt2.day).to.equal(13);
    expect(dt2.hour).to.equal(4);
    expect(dt2.minute).to.equal(31);
    expect(dt2.second).to.equal(29);
    expect(dt2.millisecond).to.equal(223);

    expect(dt3.year).to.equal(2021);
    expect(dt3.month).to.equal(5);
    expect(dt3.day).to.equal(16);
    expect(dt3.hour).to.equal(8);
    expect(dt3.minute).to.equal(36);
    expect(dt3.second).to.equal(35);
    expect(dt3.millisecond).to.equal(230);
  });

  it("각종 규칙문자를 활용하여, 문자열로 전환 할 수 있다.", () => {
    const dt = new DateTime(2019, 2, 3, 14, 5, 5, 160);
    expect(dt.toFormatString(
      "yyyy " +
      "yy " +
      "MM " +
      "M " +
      "ddd " +
      "dd " +
      "d " +
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
      "f " +
      "zzz " +
      "zz " +
      "z"
      ),
      "2019 " +
      "19 " +
      "02 " +
      "2 " +
      "목 " +
      "03 " +
      "3 " +
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
      "1 " +
      "+09:00 " +
      "+09 " +
      "+9 "
    );
  });

  it("규칙없이 문자열 변환시, \"yyyy-MM-ddTHH:mm:ss.fffzzz\"형식의 문자열이 반환된다.", () => {
    const dt = new DateTime(2019, 2, 3, 14, 5, 5, 160);
    expect(dt.toString(), "2019-02-03T14:05:50.160+09:00");
  });
});