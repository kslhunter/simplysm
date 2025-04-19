import * as assert from "node:assert";
import { DateOnly } from "@simplysm/sd-core-common";

describe("DateOnly", () => {
  it("연도의 시작일자 알아오기", () => {
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(0, 1),
      new DateOnly(2024, 12, 29),
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(1, 1),
      new DateOnly(2024, 12, 30),
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(2, 1),
      new DateOnly(2024, 12, 31),
    );
    assert.deepEqual(new DateOnly(2025, 1, 1).getWeekSeqStartDate(3, 1), new DateOnly(2025, 1, 1));
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(4, 1),
      new DateOnly(2024, 12, 26),
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(5, 1),
      new DateOnly(2024, 12, 27),
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(6, 1),
      new DateOnly(2024, 12, 28),
    );

    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(0, 4),
      new DateOnly(2024, 12, 29),
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(1, 4),
      new DateOnly(2024, 12, 30),
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(2, 4),
      new DateOnly(2024, 12, 31),
    );
    assert.deepEqual(new DateOnly(2025, 1, 1).getWeekSeqStartDate(3, 4), new DateOnly(2025, 1, 1));
    assert.deepEqual(new DateOnly(2025, 1, 1).getWeekSeqStartDate(4, 4), new DateOnly(2025, 1, 2));
    assert.deepEqual(new DateOnly(2025, 1, 1).getWeekSeqStartDate(5, 4), new DateOnly(2025, 1, 3));
    assert.deepEqual(new DateOnly(2025, 1, 1).getWeekSeqStartDate(6, 4), new DateOnly(2025, 1, 4));

    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(0, 3),
      new DateOnly(2024, 12, 29),
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(1, 3),
      new DateOnly(2024, 12, 30),
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(2, 3),
      new DateOnly(2024, 12, 31),
    );
    assert.deepEqual(new DateOnly(2025, 1, 1).getWeekSeqStartDate(3, 3), new DateOnly(2025, 1, 1));
    assert.deepEqual(new DateOnly(2025, 1, 1).getWeekSeqStartDate(4, 3), new DateOnly(2025, 1, 2));
    assert.deepEqual(new DateOnly(2025, 1, 1).getWeekSeqStartDate(5, 3), new DateOnly(2025, 1, 3));
    assert.deepEqual(
      new DateOnly(2025, 1, 1).getWeekSeqStartDate(6, 3),
      new DateOnly(2024, 12, 28),
    );

    assert.deepEqual(
      new DateOnly(2025, 2, 1).getWeekSeqStartDate(0, 1),
      new DateOnly(2025, 1, 26),
    );
    assert.deepEqual(
      new DateOnly(2025, 2, 1).getWeekSeqStartDate(1, 1),
      new DateOnly(2025, 1, 27),
    );
    assert.deepEqual(
      new DateOnly(2025, 2, 1).getWeekSeqStartDate(2, 1),
      new DateOnly(2025, 1, 28),
    );
    assert.deepEqual(
      new DateOnly(2025, 2, 1).getWeekSeqStartDate(3, 1),
      new DateOnly(2025, 1, 29),
    );
    assert.deepEqual(
      new DateOnly(2025, 2, 1).getWeekSeqStartDate(4, 1),
      new DateOnly(2025, 1, 30),
    );
    assert.deepEqual(
      new DateOnly(2025, 2, 1).getWeekSeqStartDate(5, 1),
      new DateOnly(2025, 1, 31),
    );
    assert.deepEqual(new DateOnly(2025, 2, 1).getWeekSeqStartDate(6, 1), new DateOnly(2025, 2, 1));
  });

  it("특정일자가 몇년도에 있는 주차인지 알아보기", () => {
    assert.deepEqual(
      new DateOnly(2024, 12, 29).getBaseYearMonthSeqForWeekSeq(0, 4),
      { year: 2025, month: 1 },
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 8).getBaseYearMonthSeqForWeekSeq(0, 4),
      { year: 2025, month: 1 },
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 11).getBaseYearMonthSeqForWeekSeq(0, 4),
      { year: 2025, month: 1 },
    );
    assert.deepEqual(
      new DateOnly(2025, 12, 28).getBaseYearMonthSeqForWeekSeq(0, 4),
      { year: 2025, month: 12 },
    );
    assert.deepEqual(
      new DateOnly(2026, 1, 1).getBaseYearMonthSeqForWeekSeq(0, 4),
      { year: 2025, month: 12 },
    );
  });

  it("특정일자가 연도상 몇주차 알아오기", () => {
    assert.deepEqual(
      new DateOnly(2024, 12, 29).getWeekSeqOfYear(0, 4),
      { year: 2025, weekSeq: 1 },
    );
    assert.deepEqual(new DateOnly(2025, 1, 8).getWeekSeqOfYear(0, 4), { year: 2025, weekSeq: 2 });
    assert.deepEqual(new DateOnly(2025, 1, 11).getWeekSeqOfYear(0, 4), { year: 2025, weekSeq: 2 });
    assert.deepEqual(new DateOnly(2025, 1, 12).getWeekSeqOfYear(0, 4), { year: 2025, weekSeq: 3 });
    assert.deepEqual(
      new DateOnly(2025, 12, 28).getWeekSeqOfYear(0, 4),
      { year: 2025, weekSeq: 53 },
    );
    assert.deepEqual(new DateOnly(2026, 1, 1).getWeekSeqOfYear(0, 4), { year: 2025, weekSeq: 53 });
    assert.deepEqual(new DateOnly(2026, 1, 3).getWeekSeqOfYear(0, 4), { year: 2025, weekSeq: 53 });
    assert.deepEqual(new DateOnly(2026, 1, 4).getWeekSeqOfYear(0, 4), { year: 2026, weekSeq: 1 });
  });

  it("특정일자가 연월의 몇주차 알아오기", () => {
    assert.deepEqual(
      new DateOnly(2024, 12, 29).getWeekSeqOfMonth(0, 4),
      { year: 2025, month: 1, weekSeq: 1 },
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 8).getWeekSeqOfMonth(0, 4),
      { year: 2025, month: 1, weekSeq: 2 },
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 11).getWeekSeqOfMonth(0, 4),
      { year: 2025, month: 1, weekSeq: 2 },
    );
    assert.deepEqual(
      new DateOnly(2025, 1, 12).getWeekSeqOfMonth(0, 4),
      { year: 2025, month: 1, weekSeq: 3 },
    );
    assert.deepEqual(
      new DateOnly(2025, 12, 28).getWeekSeqOfMonth(0, 4),
      { year: 2025, month: 12, weekSeq: 5 },
    );
    assert.deepEqual(
      new DateOnly(2026, 1, 1).getWeekSeqOfMonth(0, 4),
      { year: 2025, month: 12, weekSeq: 5 },
    );
    assert.deepEqual(
      new DateOnly(2026, 1, 3).getWeekSeqOfMonth(0, 4),
      { year: 2025, month: 12, weekSeq: 5 },
    );
    assert.deepEqual(
      new DateOnly(2026, 1, 4).getWeekSeqOfMonth(0, 4),
      { year: 2026, month: 1, weekSeq: 1 },
    );
  });

  it("연월주차를 통해 첫 일자 알아오기", () => {
    assert.deepEqual(
      DateOnly.getDateByYearWeekSeq({ year: 2025, month: 1, weekSeq: 1 }, 0, 4),
      new DateOnly(2024, 12, 29),
    );
    assert.deepEqual(
      DateOnly.getDateByYearWeekSeq({ year: 2025, month: 1, weekSeq: 53 }, 0, 4),
      new DateOnly(2025, 12, 28),
    );
    assert.deepEqual(
      DateOnly.getDateByYearWeekSeq({ year: 2025, month: 2, weekSeq: 2 }, 0, 4),
      new DateOnly(2025, 2, 9),
    );
    assert.deepEqual(
      DateOnly.getDateByYearWeekSeq({ year: 2025, month: 8, weekSeq: 1 }, 0, 4),
      new DateOnly(2025, 8, 3),
    );
    assert.deepEqual(
      DateOnly.getDateByYearWeekSeq({ year: 2025, month: 8, weekSeq: 1 }, 1, 4),
      new DateOnly(2025, 8, 4),
    );
  });
});