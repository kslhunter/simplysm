import * as assert from "assert";
import {describe, it} from "mocha";
import {Time} from "../../src/type/Time";

describe("Time", () => {
  it("일반 초기화시, 현재 시간이 초기값으로 설정됨", () => {
    const now = new Time();
    const nowDate = new Date();

    assert.strictEqual(now.hour, nowDate.getHours());
    assert.strictEqual(now.minute, nowDate.getMinutes());
    assert.strictEqual(now.second, nowDate.getSeconds());
    assert.strictEqual(now.millisecond, nowDate.getMilliseconds());
  });

  it("'tick(millisecond)'로 초기화 할 수 있음.", () => {
    const time = new Time(
      10 * 60 * 60 * 1000 +
      20 * 60 * 1000 +
      30 * 1000 +
      40
    );

    assert.strictEqual(time.day, 0);
    assert.strictEqual(time.hour, 10);
    assert.strictEqual(time.minute, 20);
    assert.strictEqual(time.second, 30);
    assert.strictEqual(time.millisecond, 40);
  });

  it("시간을 입력하여 초기화 할 수 있음", () => {
    const time = new Time(10, 20, 30, 40);

    assert.strictEqual(time.day, 0);
    assert.strictEqual(time.hour, 10);
    assert.strictEqual(time.minute, 20);
    assert.strictEqual(time.second, 30);
    assert.strictEqual(time.millisecond, 40);
  });

  it("시간에 일자수까지 입력하여 초기화 할 수 있음", () => {
    const time = new Time(5, 10, 20, 30, 40);

    assert.strictEqual(time.day, 5);
    assert.strictEqual(time.hour, 10);
    assert.strictEqual(time.minute, 20);
    assert.strictEqual(time.second, 30);
    assert.strictEqual(time.millisecond, 40);
  });

  it("Date 객체로 초기화 할 수 있음 (이 경우 날짜는 무시됨)", () => {
    const time = new Time(new Date(2000, 9, 20, 10, 20, 30, 40));

    assert.strictEqual(time.day, 0);
    assert.strictEqual(time.hour, 10);
    assert.strictEqual(time.minute, 20);
    assert.strictEqual(time.second, 30);
    assert.strictEqual(time.millisecond, 40);
  });

  it("'3', '03'을 파싱하면 '3시간'으로 파싱됨", () => {
    const times = [Time.parse("3"), Time.parse("03")];

    for (const time of times) {
      assert.strictEqual(time.day, 0);
      assert.strictEqual(time.hour, 3);
      assert.strictEqual(time.minute, 0);
      assert.strictEqual(time.second, 0);
      assert.strictEqual(time.millisecond, 0);
    }
  });

  it("'103', '0103'을 파싱하면 '1시간 3분'으로 파싱됨", () => {
    const times = [Time.parse("103"), Time.parse("0103")];

    for (const time of times) {
      assert.strictEqual(time.day, 0);
      assert.strictEqual(time.hour, 1);
      assert.strictEqual(time.minute, 3);
      assert.strictEqual(time.second, 0);
      assert.strictEqual(time.millisecond, 0);
    }
  });

  it("'50103', '050103'을 파싱하면 '5시간 1분 3초'으로 파싱됨", () => {
    const times = [Time.parse("50103"), Time.parse("050103")];

    for (const time of times) {
      assert.strictEqual(time.day, 0);
      assert.strictEqual(time.hour, 5);
      assert.strictEqual(time.minute, 1);
      assert.strictEqual(time.second, 3);
      assert.strictEqual(time.millisecond, 0);
    }
  });

  it("'1050103', '01050103'을 파싱하면 '1일 5시간 1분 3초'으로 파싱됨", () => {
    const times = [Time.parse("1050103"), Time.parse("01050103")];

    for (const time of times) {
      assert.strictEqual(time.day, 1);
      assert.strictEqual(time.hour, 5);
      assert.strictEqual(time.minute, 1);
      assert.strictEqual(time.second, 3);
      assert.strictEqual(time.millisecond, 0);
    }
  });

  it("'050103001'을 파싱하면 '5시간 1분 3초 1밀리초'으로 파싱됨", () => {
    const times = [Time.parse("050103001")];

    for (const time of times) {
      assert.strictEqual(time.day, 0);
      assert.strictEqual(time.hour, 5);
      assert.strictEqual(time.minute, 1);
      assert.strictEqual(time.second, 3);
      assert.strictEqual(time.millisecond, 1);
    }
  });

  it("'1050103001', '01050103001'을 파싱하면 '1일 5시간 1분 3초 1밀리초'으로 파싱됨", () => {
    const times = [Time.parse("1050103001"), Time.parse("01050103001")];

    for (const time of times) {
      assert.strictEqual(time.day, 1);
      assert.strictEqual(time.hour, 5);
      assert.strictEqual(time.minute, 1);
      assert.strictEqual(time.second, 3);
      assert.strictEqual(time.millisecond, 1);
    }
  });

  it("'1.05:01:03.001'을 파싱하면 '1일 5시간 1분 3초 1밀리초'으로 파싱됨", () => {
    const times = [Time.parse("1.05:01:03.001")];

    for (const time of times) {
      assert.strictEqual(time.day, 1);
      assert.strictEqual(time.hour, 5);
      assert.strictEqual(time.minute, 1);
      assert.strictEqual(time.second, 3);
      assert.strictEqual(time.millisecond, 1);
    }
  });

  it("시간을 변경 할 수 있음", () => {
    const time = new Time(1, 10, 20, 30, 40);
    time.day = 2;
    time.hour = 8;
    time.minute = 22;
    time.second = 28;
    time.millisecond = 44;

    assert.strictEqual(time.day, 2);
    assert.strictEqual(time.hour, 8);
    assert.strictEqual(time.minute, 22);
    assert.strictEqual(time.second, 28);
    assert.strictEqual(time.millisecond, 44);
  });

  it("시간을 'tick'으로 변경 할 수 있음", () => {
    const time = new Time(1, 10, 20, 30, 40);
    time.tick = new Time(2, 8, 22, 28, 44).tick;

    assert.strictEqual(time.day, 2);
    assert.strictEqual(time.hour, 8);
    assert.strictEqual(time.minute, 22);
    assert.strictEqual(time.second, 28);
    assert.strictEqual(time.millisecond, 44);
  });

  it("시간을 체인 방식으로 변경 할 수 있음", () => {
    let time = new Time(1, 10, 20, 30, 40);
    time = time
      .setDay(2)
      .setHour(8)
      .setMinute(22)
      .setSecond(28)
      .setMillisecond(44);

    assert.strictEqual(time.day, 2);
    assert.strictEqual(time.hour, 8);
    assert.strictEqual(time.minute, 22);
    assert.strictEqual(time.second, 28);
    assert.strictEqual(time.millisecond, 44);
  });

  it("시간을 체인 방식으로 더하거나 뺄 수 있음.", () => {
    let time = new Time(1, 10, 20, 30, 40);
    time = time
      .addDays(1)
      .addHours(-2)
      .addMinutes(2)
      .addSeconds(-3)
      .addMilliseconds(4);

    assert.strictEqual(time.day, 2);
    assert.strictEqual(time.hour, 8);
    assert.strictEqual(time.minute, 22);
    assert.strictEqual(time.second, 27);
    assert.strictEqual(time.millisecond, 44);
  });

  it("시간 포맷을 설정하여, 시간 문자열을 가져올 수 있음", () => {
    const time = new Time(1, 20, 9, 3, 123);

    assert.strictEqual(time.toFormatString("dd d tt hh h HH H mm m ss s fff ff f"), "01 1 오후 08 8 20 20 09 9 03 3 123 12 1");
  });
});
