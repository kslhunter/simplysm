import { expect } from "chai";
import { DateOnly } from "@simplysm/sd-core-common";

describe("(common) core.types.DateOnly", () => {
  it("현재의 날짜 객체를 생성할 수 있다.", () => {
    const d = new DateOnly();
    expect(d.tick).to
      .to.most(Date.now() + (24 * 60 * 60 * 1000))
      .and
      .to.least(Date.now() - (24 * 60 * 60 * 1000));
  });

  it("year, month, day 을 통해 생성할 수 있으며, 해당 값들을 추가로 설정하거나, 가져올 수 있다.", () => {
    const d1 = new DateOnly(2019, 2, 12);

    //초기값 가져오기 (체크)
    expect(d1.year).to.equal(2019);
    expect(d1.month).to.equal(2);
    expect(d1.day).to.equal(12);

    //값 변경
    d1.year = 2020;
    expect(d1.year).to.be.equal(2020);

    d1.month = 3;
    expect(d1.month).to.be.equal(3);

    d1.day = 20;
    expect(d1.day).to.be.equal(20);
  });

  it("tick을 통해 생성할 수 있으며, 설정하거나, 조회할 수 있다. 일자 미만의 값은 tick에서 제외된다.", () => {
    const tick = Date.now();
    const d = new DateOnly(tick);
    const datetime = new Date(tick);
    const date = new Date(datetime.getFullYear(), datetime.getMonth(), datetime.getDate());
    expect(d.tick).to.equal(date.getTime());

    const newTick = tick + (12 * 60 * 60 * 1000);
    d.tick = newTick;
    expect(d.tick).to.equal(newTick - (newTick % (24 * 60 * 60 * 1000)));
  });

  describe("문자열을 전환하여 생성할 수 있다", () => {
    it("yyyy-MM-dd", () => {
      const d = DateOnly.parse("2019-02-12");
      expect(d.year).to.equal(2019);
      expect(d.month).to.equal(2);
      expect(d.day).to.equal(12);
    });

    it("yyyyMMdd", () => {
      const d = DateOnly.parse("20190212");
      expect(d.year).to.equal(2019);
      expect(d.month).to.equal(2);
      expect(d.day).to.equal(12);
    });
  });

  it("요일을 가져올 수 있다.", () => {
    const d1 = new DateOnly(2019, 11, 10); //일
    const d2 = new DateOnly(2019, 11, 11); //월
    const d3 = new DateOnly(2019, 11, 12); //화
    const d4 = new DateOnly(2019, 11, 13); //수
    const d5 = new DateOnly(2019, 11, 14); //목
    const d6 = new DateOnly(2019, 11, 15); //금
    const d7 = new DateOnly(2019, 11, 16); //토

    expect(d1.week).to.equal(0);
    expect(d2.week).to.equal(1);
    expect(d3.week).to.equal(2);
    expect(d4.week).to.equal(3);
    expect(d5.week).to.equal(4);
    expect(d6.week).to.equal(5);
    expect(d7.week).to.equal(6);
  });

  it("일자등을 변경, 추가하는 작업을 체인 형태로 처리할 수 있다. 이 경우, 기존의 데이터는 변경되지 않는다.", () => {
    const d1 = new DateOnly(2019, 2, 12);
    const d2 = d1.setYear(2020)
      .setMonth(3)
      .setDay(13);
    const d3 = d2.addYears(1)
      .addMonths(2)
      .addDays(3);

    expect(d1.year).to.equal(2019);
    expect(d1.month).to.equal(2);
    expect(d1.day).to.equal(12);

    expect(d2.year).to.equal(2020);
    expect(d2.month).to.equal(3);
    expect(d2.day).to.equal(13);

    expect(d3.year).to.equal(2021);
    expect(d3.month).to.equal(5);
    expect(d3.day).to.equal(16);
  });

  it("각종 규칙문자를 활용하여, 문자열로 전환 할 수 있다.", () => {
    const d = new DateOnly(2019, 2, 3);
    expect(
      d.toFormatString(
        "yyyy " +
        "yy " +
        "MM " +
        "M " +
        "ddd " +
        "dd " +
        "d "
      ),
      "2019 " +
      "19 " +
      "02 " +
      "2 " +
      "목 " +
      "03 " +
      "3 "
    );
  });

  it("규칙없이 문자열 변환시, \"yyyy-MM-dd\"형식의 문자열이 반환된다.", () => {
    const d = new DateOnly(2019, 2, 3);
    expect(d.toString()).to.equal("2019-02-03");
  });

  it("[Fix] 3월 31일에 1달전의 데이터를 가져오면 2월 마지막날이 아닌 다른날이 나타나는 현상", () => {
    const d1 = new DateOnly(2020, 3, 3).addMonths(-1);
    expect(d1.toString()).to.equal("2020-02-03");

    const d2 = new DateOnly(2020, 3, 31).addMonths(-1);
    expect(d2.toString()).to.equal("2020-02-29");
  });

  it("특정 날짜의 월별주차를 가져올 수 있다.", () => {
    const test = (year: number, month: number, day: number, year2: number, month2: number, week2: number) => {
      const r = DateOnly.getWeekOfMonth(new DateOnly(year, month, day), 3, 1);
      expect(r.month.tick).to.equal(new DateOnly(year2, month2, 1).tick);
      expect(r.week).to.equal(week2);
    };

    test(2020, 8, 1, 2020, 7, 5);
    test(2020, 8, 2, 2020, 7, 5);
    test(2020, 8, 3, 2020, 8, 1);
    test(2020, 8, 9, 2020, 8, 1);
    test(2020, 8, 10, 2020, 8, 2);
    test(2020, 8, 16, 2020, 8, 2);
    test(2020, 8, 17, 2020, 8, 3);
    test(2020, 8, 23, 2020, 8, 3);
    test(2020, 8, 24, 2020, 8, 4);
    test(2020, 8, 30, 2020, 8, 4);
    test(2020, 8, 31, 2020, 9, 1);
    test(2020, 9, 30, 2020, 9, 5);
    test(2020, 10, 1, 2020, 9, 5);
    test(2020, 3, 31, 2020, 4, 1);
  });
});