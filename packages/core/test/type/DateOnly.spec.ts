import * as assert from "assert";
import {describe, it} from "mocha";
import {DateOnly} from "../../src/type/DateOnly";

describe("DateOnly", () => {
  it("일반 초기화시, 오늘이 초기값으로 설정됨", () => {
    const today = new DateOnly();

    assert.strictEqual(today.year, new Date().getFullYear());
    assert.strictEqual(today.month, new Date().getMonth() + 1);
    assert.strictEqual(today.day, new Date().getDate());
  });

  it("'tick'으로 초기화 할 수 있음. (이 경우 시간은 무시됨)", () => {
    const dateOnly = new DateOnly(new Date(2000, 9, 20).getTime());

    assert.strictEqual(dateOnly.year, 2000);
    assert.strictEqual(dateOnly.month, 10);
    assert.strictEqual(dateOnly.day, 20);
    assert.strictEqual(dateOnly.date.getHours(), 0);
    assert.strictEqual(dateOnly.date.getMinutes(), 0);
    assert.strictEqual(dateOnly.date.getSeconds(), 0);
    assert.strictEqual(dateOnly.date.getMilliseconds(), 0);
  });

  it("연월일을 입력하여 초기화 할 수 있음", () => {
    const dateOnly = new DateOnly(2000, 10, 20);

    assert.strictEqual(dateOnly.year, 2000);
    assert.strictEqual(dateOnly.month, 10);
    assert.strictEqual(dateOnly.day, 20);
  });

  it("Date 객체로 초기화 할 수 있음 (이 경우 시간은 무시됨)", () => {
    const dateOnly = new DateOnly(new Date(2000, 9, 20));

    assert.strictEqual(dateOnly.year, 2000);
    assert.strictEqual(dateOnly.month, 10);
    assert.strictEqual(dateOnly.day, 20);
    assert.strictEqual(dateOnly.date.getHours(), 0);
    assert.strictEqual(dateOnly.date.getMinutes(), 0);
    assert.strictEqual(dateOnly.date.getSeconds(), 0);
    assert.strictEqual(dateOnly.date.getMilliseconds(), 0);
  });

  it("일자만 있는 'ISO'형식의 문자열에서 일자를 파싱할 수 있음", () => {
    const dateOnly = DateOnly.parse("2000-10-20");

    assert.strictEqual(dateOnly.year, 2000);
    assert.strictEqual(dateOnly.month, 10);
    assert.strictEqual(dateOnly.day, 20);
  });

  it("시간까지 있는 'ISO'형식의 문자열에서 일자를 파싱할 수 있음 (이 경우 시간은 무시됨)", () => {
    const dateOnly = DateOnly.parse("2000-10-20 16:03:42");

    assert.strictEqual(dateOnly.year, 2000);
    assert.strictEqual(dateOnly.month, 10);
    assert.strictEqual(dateOnly.day, 20);
    assert.strictEqual(dateOnly.date.getHours(), 0);
    assert.strictEqual(dateOnly.date.getMinutes(), 0);
    assert.strictEqual(dateOnly.date.getSeconds(), 0);
    assert.strictEqual(dateOnly.date.getMilliseconds(), 0);
  });

  it("연월일을 변경 할 수 있음", () => {
    const dateOnly = new DateOnly(2000, 10, 20);
    dateOnly.year = 2002;
    dateOnly.month = 8;
    dateOnly.day = 9;

    assert.strictEqual(dateOnly.year, 2002);
    assert.strictEqual(dateOnly.month, 8);
    assert.strictEqual(dateOnly.day, 9);
  });

  it("연월일을 체인 방식으로 변경 할 수 있음", () => {
    let dateOnly = new DateOnly(2000, 10, 20);
    dateOnly = dateOnly.setYear(2002).setMonth(8).setDay(9);

    assert.strictEqual(dateOnly.year, 2002);
    assert.strictEqual(dateOnly.month, 8);
    assert.strictEqual(dateOnly.day, 9);
  });

  it("연월일을 체인 방식으로 더하거나 뺄 수 있음.", () => {
    let dateOnly = new DateOnly(2000, 10, 20);
    dateOnly = dateOnly.addYears(1).addMonths(-1).addDays(2);

    assert.strictEqual(dateOnly.year, 2001);
    assert.strictEqual(dateOnly.month, 9);
    assert.strictEqual(dateOnly.day, 22);
  });

  it("일자 포맷을 설정하여, 일자 문자열을 가져올 수 있음", () => {
    const dateOnly = new DateOnly(2000, 10, 20);

    assert.strictEqual(dateOnly.toFormatString("yyyy-MM-dd(ddd)"), "2000-10-20(금)");
  });
});
