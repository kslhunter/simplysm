import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./date.expected";
import { DateTime } from "@simplysm/core-common";

describe("Expr - 날짜/시간 함수", () => {
  describe("year - 연도 추출", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        yearPart: expr.year(item.createdAt),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        yearPart: {
          type: "year",
          arg: { type: "column", path: ["T1", "createdAt"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.year[dialect]);
    });
  });

  describe("month - 월 추출", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        monthPart: expr.month(item.createdAt),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        monthPart: {
          type: "month",
          arg: { type: "column", path: ["T1", "createdAt"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.month[dialect]);
    });
  });

  describe("day - 일 추출", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        dayPart: expr.day(item.createdAt),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        dayPart: {
          type: "day",
          arg: { type: "column", path: ["T1", "createdAt"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.day[dialect]);
    });
  });

  describe("hour - 시 추출", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        hourPart: expr.hour(item.createdAt),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        hourPart: {
          type: "hour",
          arg: { type: "column", path: ["T1", "createdAt"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.hour[dialect]);
    });
  });

  describe("minute - 분 추출", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        minutePart: expr.minute(item.createdAt),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        minutePart: {
          type: "minute",
          arg: { type: "column", path: ["T1", "createdAt"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.minute[dialect]);
    });
  });

  describe("second - 초 추출", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        secondPart: expr.second(item.createdAt),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        secondPart: {
          type: "second",
          arg: { type: "column", path: ["T1", "createdAt"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.second[dialect]);
    });
  });

  describe("dateDiff - 날짜 차이 (일)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        daysDiff: expr.dateDiff("day", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        daysDiff: {
          type: "dateDiff",
          separator: "day",
          from: { type: "column", path: ["T1", "createdAt"] },
          to: { type: "value", value: targetDate },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffDay[dialect]);
    });
  });

  describe("dateDiff - 날짜 차이 (년)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        yearsDiff: expr.dateDiff("year", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        yearsDiff: {
          type: "dateDiff",
          separator: "year",
          from: { type: "column", path: ["T1", "createdAt"] },
          to: { type: "value", value: targetDate },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffYear[dialect]);
    });
  });

  describe("dateDiff - 날짜 차이 (월)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        monthsDiff: expr.dateDiff("month", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        monthsDiff: {
          type: "dateDiff",
          separator: "month",
          from: { type: "column", path: ["T1", "createdAt"] },
          to: { type: "value", value: targetDate },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffMonth[dialect]);
    });
  });

  describe("dateDiff - 날짜 차이 (시)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        hoursDiff: expr.dateDiff("hour", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        hoursDiff: {
          type: "dateDiff",
          separator: "hour",
          from: { type: "column", path: ["T1", "createdAt"] },
          to: { type: "value", value: targetDate },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffHour[dialect]);
    });
  });

  describe("dateDiff - 날짜 차이 (분)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        minutesDiff: expr.dateDiff("minute", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        minutesDiff: {
          type: "dateDiff",
          separator: "minute",
          from: { type: "column", path: ["T1", "createdAt"] },
          to: { type: "value", value: targetDate },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffMinute[dialect]);
    });
  });

  describe("dateDiff - 날짜 차이 (초)", () => {
    const db = createTestDb();
    const targetDate = new DateTime(2024, 1, 1);
    const def = db
      .user()
      .select((item) => ({
        secondsDiff: expr.dateDiff("second", item.createdAt, targetDate),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        secondsDiff: {
          type: "dateDiff",
          separator: "second",
          from: { type: "column", path: ["T1", "createdAt"] },
          to: { type: "value", value: targetDate },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateDiffSecond[dialect]);
    });
  });

  describe("dateAdd - 날짜 더하기 (월)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        nextMonth: expr.dateAdd("month", item.createdAt, 1),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        nextMonth: {
          type: "dateAdd",
          separator: "month",
          source: { type: "column", path: ["T1", "createdAt"] },
          value: { type: "value", value: 1 },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddMonth[dialect]);
    });
  });

  describe("dateAdd - 날짜 더하기 (년)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        nextYear: expr.dateAdd("year", item.createdAt, 1),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddYear[dialect]);
    });
  });

  describe("dateAdd - 날짜 더하기 (일)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        nextWeek: expr.dateAdd("day", item.createdAt, 7),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddDay[dialect]);
    });
  });

  describe("dateAdd - 날짜 더하기 (시)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        twoHoursLater: expr.dateAdd("hour", item.createdAt, 2),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddHour[dialect]);
    });
  });

  describe("dateAdd - 날짜 더하기 (분)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        thirtyMinLater: expr.dateAdd("minute", item.createdAt, 30),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddMinute[dialect]);
    });
  });

  describe("dateAdd - 날짜 더하기 (초)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        fortyFiveSecLater: expr.dateAdd("second", item.createdAt, 45),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateAddSecond[dialect]);
    });
  });

  describe("formatDate - 날짜 포맷팅", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        formatted: expr.formatDate(item.createdAt, "yyyy-MM-dd HH:mm:ss"),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        formatted: {
          type: "formatDate",
          source: { type: "column", path: ["T1", "createdAt"] },
          format: "yyyy-MM-dd HH:mm:ss",
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.formatDate[dialect]);
    });
  });

  describe("isoWeek - ISO 주차", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        week: expr.isoWeek(expr.cast(item.createdAt, { type: "date" })),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        week: {
          type: "isoWeek",
          arg: {
            type: "cast",
            source: { type: "column", path: ["T1", "createdAt"] },
            targetType: { type: "date" },
          },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.isoWeek[dialect]);
    });
  });

  describe("isoWeekStartDate - ISO 주차 시작일", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        weekStart: expr.isoWeekStartDate(expr.cast(item.createdAt, { type: "date" })),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        weekStart: {
          type: "isoWeekStartDate",
          arg: {
            type: "cast",
            source: { type: "column", path: ["T1", "createdAt"] },
            targetType: { type: "date" },
          },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.isoWeekStartDate[dialect]);
    });
  });

  describe("isoYearMonth - ISO 년월 (YYYY-MM)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        yearMonth: expr.isoYearMonth(expr.cast(item.createdAt, { type: "date" })),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        yearMonth: {
          type: "isoYearMonth",
          arg: {
            type: "cast",
            source: { type: "column", path: ["T1", "createdAt"] },
            targetType: { type: "date" },
          },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.isoYearMonth[dialect]);
    });
  });
});
