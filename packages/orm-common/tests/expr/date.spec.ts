import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./date.expected";
import { DateTime } from "@simplysm/core-common";

describe("Expr - 날짜/시간 함수", () => {
  describe("year - extract year", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        yearPart: expr.year(item.createdAt),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.year[dialect]);
    });
  });

  describe("month - extract month", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        monthPart: expr.month(item.createdAt),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.month[dialect]);
    });
  });

  describe("day - extract day", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        dayPart: expr.day(item.createdAt),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.day[dialect]);
    });
  });

  describe("hour - extract hour", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        hourPart: expr.hour(item.createdAt),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.hour[dialect]);
    });
  });

  describe("minute - extract minute", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        minutePart: expr.minute(item.createdAt),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.minute[dialect]);
    });
  });

  describe("second - extract second", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        secondPart: expr.second(item.createdAt),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.second[dialect]);
    });
  });

  describe("dateDiff - date difference (days)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        daysDiff: expr.dateDiff("day", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffDay[dialect]);
    });
  });

  describe("dateDiff - date difference (years)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        yearsDiff: expr.dateDiff("year", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffYear[dialect]);
    });
  });

  describe("dateDiff - date difference (months)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        monthsDiff: expr.dateDiff("month", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffMonth[dialect]);
    });
  });

  describe("dateDiff - date difference (hours)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        hoursDiff: expr.dateDiff("hour", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffHour[dialect]);
    });
  });

  describe("dateDiff - date difference (minutes)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        minutesDiff: expr.dateDiff("minute", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffMinute[dialect]);
    });
  });

  describe("dateDiff - date difference (seconds)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        secondsDiff: expr.dateDiff("second", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffSecond[dialect]);
    });
  });

  describe("dateAdd - add date (months)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        nextMonth: expr.dateAdd("month", item.createdAt, 1),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddMonth[dialect]);
    });
  });

  describe("dateAdd - add date (years)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        nextYear: expr.dateAdd("year", item.createdAt, 1),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddYear[dialect]);
    });
  });

  describe("dateAdd - add date (days)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        nextWeek: expr.dateAdd("day", item.createdAt, 7),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddDay[dialect]);
    });
  });

  describe("dateAdd - add date (hours)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        twoHoursLater: expr.dateAdd("hour", item.createdAt, 2),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddHour[dialect]);
    });
  });

  describe("dateAdd - add date (minutes)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        thirtyMinLater: expr.dateAdd("minute", item.createdAt, 30),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddMinute[dialect]);
    });
  });

  describe("dateAdd - add date (seconds)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        fortyFiveSecLater: expr.dateAdd("second", item.createdAt, 45),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddSecond[dialect]);
    });
  });

  describe("formatDate - date formatting", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        formatted: expr.formatDate(item.createdAt, "yyyy-MM-dd HH:mm:ss"),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.formatDate[dialect]);
    });
  });

  describe("isoWeek - ISO week", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        week: expr.isoWeek(expr.cast(item.createdAt, { type: "date" })),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.isoWeek[dialect]);
    });
  });

  describe("isoWeekStartDate - ISO week start date", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        weekStart: expr.isoWeekStartDate(expr.cast(item.createdAt, { type: "date" })),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.isoWeekStartDate[dialect]);
    });
  });

  describe("isoYearMonth - ISO year-month (YYYYMM)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        yearMonth: expr.isoYearMonth(expr.cast(item.createdAt, { type: "date" })),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.isoYearMonth[dialect]);
    });
  });
});
