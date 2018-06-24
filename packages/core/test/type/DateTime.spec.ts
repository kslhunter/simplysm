import * as assert from "assert";
import {describe, it} from "mocha";
import {DateTime} from "../../src/type/DateTime";
import {DateOnly} from "../../src/type/DateOnly";
import {Time} from "../../src/type/Time";

describe("DateTime", () => {
  it("일반 초기화시, 현재가 초기값으로 설정됨", () => {
    const now = new DateTime();
    const newDate = new Date();

    assert.strictEqual(now.year, newDate.getFullYear());
    assert.strictEqual(now.month, newDate.getMonth() + 1);
    assert.strictEqual(now.day, newDate.getDate());
    assert.strictEqual(now.hour, newDate.getHours());
    assert.strictEqual(now.minute, newDate.getMinutes());
    assert.strictEqual(now.second, newDate.getSeconds());
    assert.strictEqual(now.millisecond, newDate.getMilliseconds());
  });

  it("'tick'으로 초기화 할 수 있음.", () => {
    const dateTime = new DateTime(new Date(2000, 9, 20, 10, 20, 30, 40).getTime());

    assert.strictEqual(dateTime.year, 2000);
    assert.strictEqual(dateTime.month, 10);
    assert.strictEqual(dateTime.day, 20);
    assert.strictEqual(dateTime.hour, 10);
    assert.strictEqual(dateTime.minute, 20);
    assert.strictEqual(dateTime.second, 30);
    assert.strictEqual(dateTime.millisecond, 40);
  });

  it("날짜/시간을 직접 입력하여 초기화 할 수 있음", () => {
    const dateTime = new DateTime(2000, 10, 20, 10, 20, 30, 40);

    assert.strictEqual(dateTime.year, 2000);
    assert.strictEqual(dateTime.month, 10);
    assert.strictEqual(dateTime.day, 20);
    assert.strictEqual(dateTime.hour, 10);
    assert.strictEqual(dateTime.minute, 20);
    assert.strictEqual(dateTime.second, 30);
    assert.strictEqual(dateTime.millisecond, 40);
  });

  it("Date 객체로 초기화 할 수 있음", () => {
    const dateTime = new DateTime(new Date(2000, 9, 20, 10, 20, 30, 40));

    assert.strictEqual(dateTime.year, 2000);
    assert.strictEqual(dateTime.month, 10);
    assert.strictEqual(dateTime.day, 20);
    assert.strictEqual(dateTime.hour, 10);
    assert.strictEqual(dateTime.minute, 20);
    assert.strictEqual(dateTime.second, 30);
    assert.strictEqual(dateTime.millisecond, 40);
  });

  it("'ISO'형식의 문자열에서 일자를 파싱할 수 있음", () => {
    const dateTime = DateTime.parse("2000-10-20 10:20:30.040");

    assert.strictEqual(dateTime.year, 2000);
    assert.strictEqual(dateTime.month, 10);
    assert.strictEqual(dateTime.day, 20);
    assert.strictEqual(dateTime.hour, 10);
    assert.strictEqual(dateTime.minute, 20);
    assert.strictEqual(dateTime.second, 30);
    assert.strictEqual(dateTime.millisecond, 40);
  });

  it("날짜/시간을 변경 할 수 있음", () => {
    const dateTime = new DateTime(2000, 10, 20, 10, 20, 30, 40);
    dateTime.year = 2002;
    dateTime.month = 8;
    dateTime.day = 9;
    dateTime.hour = 11;
    dateTime.minute = 22;
    dateTime.second = 20;
    dateTime.millisecond = 10;

    assert.strictEqual(dateTime.year, 2002);
    assert.strictEqual(dateTime.month, 8);
    assert.strictEqual(dateTime.day, 9);
    assert.strictEqual(dateTime.hour, 11);
    assert.strictEqual(dateTime.minute, 22);
    assert.strictEqual(dateTime.second, 20);
    assert.strictEqual(dateTime.millisecond, 10);
  });

  it("날짜/시간을 체인 방식으로 변경 할 수 있음", () => {
    let dateTime = new DateTime(2000, 10, 20, 10, 20, 30, 40);
    dateTime = dateTime
      .setYear(2002)
      .setMonth(8)
      .setDay(9)
      .setHour(11)
      .setMinute(22)
      .setSecond(20)
      .setMillisecond(10);

    assert.strictEqual(dateTime.year, 2002);
    assert.strictEqual(dateTime.month, 8);
    assert.strictEqual(dateTime.day, 9);
    assert.strictEqual(dateTime.hour, 11);
    assert.strictEqual(dateTime.minute, 22);
    assert.strictEqual(dateTime.second, 20);
    assert.strictEqual(dateTime.millisecond, 10);
  });

  it("날짜/시간을 체인 방식으로 더하거나 뺄 수 있음.", () => {
    let dateTime = new DateTime(2000, 10, 20, 10, 20, 30, 40);
    dateTime = dateTime
      .addYears(1)
      .addMonths(-1)
      .addDays(2)
      .addHours(-2)
      .addMinutes(3)
      .addSeconds(-3)
      .addMilliseconds(4);

    assert.strictEqual(dateTime.year, 2001);
    assert.strictEqual(dateTime.month, 9);
    assert.strictEqual(dateTime.day, 22);
    assert.strictEqual(dateTime.hour, 8);
    assert.strictEqual(dateTime.minute, 23);
    assert.strictEqual(dateTime.second, 27);
    assert.strictEqual(dateTime.millisecond, 44);
  });

  it("날짜/시간을 'tick'으로 변경할 수 있음", () => {
    const dateTime = new DateTime();
    dateTime.tick = new Date(2000, 9, 20, 10, 20, 30, 40).getTime();

    assert.strictEqual(dateTime.year, 2000);
    assert.strictEqual(dateTime.month, 10);
    assert.strictEqual(dateTime.day, 20);
    assert.strictEqual(dateTime.hour, 10);
    assert.strictEqual(dateTime.minute, 20);
    assert.strictEqual(dateTime.second, 30);
    assert.strictEqual(dateTime.millisecond, 40);
  });

  it("DateOnly 객체로 변경 할 수 있음 (이 경우 시간은 무시됨)", () => {
    const dateTime = new DateTime(2000, 10, 20, 10, 20, 30, 40);
    const dateOnly = dateTime.toDateOnly();

    assert.strictEqual(dateOnly instanceof DateOnly, true);
    assert.strictEqual(dateOnly.year, 2000);
    assert.strictEqual(dateOnly.month, 10);
    assert.strictEqual(dateOnly.day, 20);
    assert.strictEqual(dateOnly.date.getHours(), 0);
    assert.strictEqual(dateOnly.date.getMinutes(), 0);
    assert.strictEqual(dateOnly.date.getSeconds(), 0);
    assert.strictEqual(dateOnly.date.getMilliseconds(), 0);
  });

  it("Time 객체로 변경 할 수 있음 (이 경우 날짜는 무시됨)", () => {
    const dateTime = new DateTime(2000, 10, 20, 10, 20, 30, 40);
    const time = dateTime.toTime();

    assert.strictEqual(time instanceof Time, true);
    assert.strictEqual(time.day, 0);
    assert.strictEqual(time.hour, 10);
    assert.strictEqual(time.minute, 20);
    assert.strictEqual(time.second, 30);
    assert.strictEqual(time.millisecond, 40);
  });

  it("일자 포맷을 설정하여, 일자 문자열을 가져올 수 있음", () => {
    const dateTime = new DateTime(2000, 10, 20, 10, 20, 30, 40);

    assert.strictEqual(dateTime.toFormatString("yyyy년 M월 d일 dddd tt h시 m분 s.fff초 (zzz)"), "2000년 10월 20일 금요일 오전 10시 20분 30.040초 (+09:00)");
  });

  it("포맷없이 문자열로 변환하면 'ISO'문자열을 반환한다.", () => {
    const dateTime = new DateTime(2000, 10, 20, 10, 20, 30, 40);
    assert.strictEqual(dateTime.toString(), "2000-10-20T10:20:30.040+09:00");
  });
});
