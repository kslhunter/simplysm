import { describe, it, expect } from "vitest";
import { DateOnly } from "@simplysm/core-common";

describe("DateOnly", () => {
  //#region Constructor

  describe("constructor", () => {
    it("Returns today's date when created without arguments", () => {
      const now = new Date();
      const dateOnly = new DateOnly();

      expect(dateOnly.year).toBe(now.getFullYear());
      expect(dateOnly.month).toBe(now.getMonth() + 1);
      expect(dateOnly.day).toBe(now.getDate());
    });

    it("Creates with year/month/day", () => {
      const dateOnly = new DateOnly(2025, 1, 6);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("Creates with tick (millisecond)", () => {
      const tick = new Date(2025, 0, 6).getTime();
      const dateOnly = new DateOnly(tick);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("Creates with Date type", () => {
      const date = new Date(2025, 0, 6, 15, 30, 45);
      const dateOnly = new DateOnly(date);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("Ignores time when creating from Date type", () => {
      const date1 = new Date(2025, 0, 6, 0, 0, 0);
      const date2 = new Date(2025, 0, 6, 23, 59, 59);

      const dateOnly1 = new DateOnly(date1);
      const dateOnly2 = new DateOnly(date2);

      expect(dateOnly1.tick).toBe(dateOnly2.tick);
    });

    it("Creates February 29 in leap year", () => {
      const dateOnly = new DateOnly(2024, 2, 29);

      expect(dateOnly.year).toBe(2024);
      expect(dateOnly.month).toBe(2);
      expect(dateOnly.day).toBe(29);
      expect(dateOnly.isValid).toBe(true);
    });

    it("Adjusts February 29 to March 1 in non-leap year (JS Date behavior)", () => {
      const dateOnly = new DateOnly(2023, 2, 29);

      expect(dateOnly.year).toBe(2023);
      expect(dateOnly.month).toBe(3);
      expect(dateOnly.day).toBe(1);
    });

    it("Adjusts invalid month (13) to January next year (JS Date behavior)", () => {
      const dateOnly = new DateOnly(2024, 13, 1);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(1);
    });
  });

  //#endregion

  //#region parse

  describe("parse()", () => {
    it("Parses yyyy-MM-dd format", () => {
      const dateOnly = DateOnly.parse("2025-01-06");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("Parses yyyyMMdd format", () => {
      const dateOnly = DateOnly.parse("20250106");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("Parses ISO 8601 format", () => {
      const dateOnly = DateOnly.parse("2025-01-06T00:00:00Z");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("Throws error for invalid format", () => {
      expect(() => DateOnly.parse("invalid-date")).toThrow("Unable to parse date format");
    });

    it("Parses year-end boundary (December 31)", () => {
      const dateOnly = DateOnly.parse("2024-12-31");

      expect(dateOnly.year).toBe(2024);
      expect(dateOnly.month).toBe(12);
      expect(dateOnly.day).toBe(31);
    });

    it("Parses year-start boundary (January 1)", () => {
      const dateOnly = DateOnly.parse("2025-01-01");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(1);
    });

    it("Parses February 29 in leap year", () => {
      const dateOnly = DateOnly.parse("2024-02-29");

      expect(dateOnly.year).toBe(2024);
      expect(dateOnly.month).toBe(2);
      expect(dateOnly.day).toBe(29);
    });

    it("Parses February 28 in leap year", () => {
      const dateOnly = DateOnly.parse("2024-02-28");

      expect(dateOnly.year).toBe(2024);
      expect(dateOnly.month).toBe(2);
      expect(dateOnly.day).toBe(28);
    });
  });

  //#endregion

  //#region Getters

  describe("Getters", () => {
    it("Returns year", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.year).toBe(2025);
    });

    it("Returns month (1-12)", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.month).toBe(1);
    });

    it("Returns day", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.day).toBe(6);
    });

    it("Returns tick", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.tick).toBe(new Date(2025, 0, 6).getTime());
    });

    it("Returns dayOfWeek (Sunday-Saturday: 0-6)", () => {
      // 2025-01-06 is Monday (1)
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.dayOfWeek).toBe(1);
    });

    it("Returns isValid", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.isValid).toBe(true);
    });

    it("Invalid date returns isValid as false", () => {
      const dateOnly = new DateOnly(NaN);
      expect(dateOnly.isValid).toBe(false);
    });
  });

  //#endregion

  //#region setX methods (immutable)

  describe("setYear()", () => {
    it("Returns new instance with year changed", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.setYear(2026);

      expect(newDateOnly.year).toBe(2026);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(6);
      expect(dateOnly.year).toBe(2025); // original immutable
    });

    it("Adjusts February 29 from leap year to non-leap year with setYear", () => {
      const dateOnly = new DateOnly(2024, 2, 29); // 2024 is leap year
      const newDateOnly = dateOnly.setYear(2023); // 2023 is non-leap year

      expect(newDateOnly.year).toBe(2023);
      expect(newDateOnly.month).toBe(3);
      expect(newDateOnly.day).toBe(1); // February 29 → March 1
    });
  });

  describe("setMonth()", () => {
    it("Returns new instance with month changed", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.setMonth(2);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(6);
      expect(dateOnly.month).toBe(1); // original immutable
    });

    it("Adjusts to last day of month if target month has fewer days", () => {
      // January 31 → February (28 days max)
      const dateOnly = new DateOnly(2025, 1, 31);
      const newDateOnly = dateOnly.setMonth(2);

      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(28); // February's last day
    });

    it("setMonth(13) returns January next year", () => {
      const dateOnly = new DateOnly(2025, 6, 15);
      const result = dateOnly.setMonth(13);

      expect(result.year).toBe(2026);
      expect(result.month).toBe(1);
      expect(result.day).toBe(15);
    });

    it("setMonth(0) returns December previous year", () => {
      const dateOnly = new DateOnly(2025, 6, 15);
      const result = dateOnly.setMonth(0);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(12);
      expect(result.day).toBe(15);
    });

    it("setMonth(-1) returns November previous year", () => {
      const dateOnly = new DateOnly(2025, 6, 15);
      const result = dateOnly.setMonth(-1);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(11);
      expect(result.day).toBe(15);
    });
  });

  describe("setDay()", () => {
    it("Returns new instance with day changed", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.setDay(15);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(15);
      expect(dateOnly.day).toBe(6); // original immutable
    });
  });

  //#endregion

  //#region addX methods (immutable)

  describe("addYears()", () => {
    it("Adds positive years", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addYears(2);

      expect(newDateOnly.year).toBe(2027);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(6);
    });

    it("Adds negative years (subtraction)", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addYears(-1);

      expect(newDateOnly.year).toBe(2024);
    });
  });

  describe("addMonths()", () => {
    it("Adds positive months", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addMonths(3);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(4);
      expect(newDateOnly.day).toBe(6);
    });

    it("Adds negative months (subtraction)", () => {
      const dateOnly = new DateOnly(2025, 3, 6);
      const newDateOnly = dateOnly.addMonths(-2);

      expect(newDateOnly.month).toBe(1);
    });

    it("Handles year boundary when adding months", () => {
      const dateOnly = new DateOnly(2025, 11, 6);
      const newDateOnly = dateOnly.addMonths(3);

      expect(newDateOnly.year).toBe(2026);
      expect(newDateOnly.month).toBe(2);
    });
  });

  describe("addDays()", () => {
    it("Adds positive days", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addDays(10);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(16);
    });

    it("Adds negative days (subtraction)", () => {
      const dateOnly = new DateOnly(2025, 1, 16);
      const newDateOnly = dateOnly.addDays(-10);

      expect(newDateOnly.day).toBe(6);
    });

    it("Handles month boundary when adding days", () => {
      const dateOnly = new DateOnly(2025, 1, 31);
      const newDateOnly = dateOnly.addDays(1);

      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(1);
    });
  });

  //#endregion

  //#region Formatting

  describe("toFormatString()", () => {
    it("Formats to yyyy-MM-dd format", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyy-MM-dd")).toBe("2025-01-06");
    });

    it("Formats to yyyyMMdd format", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyyMMdd")).toBe("20250106");
    });

    it("Formats with Korean date format pattern (yyyy year M month d day)", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyy년 M월 d일")).toBe("2025년 1월 6일");
    });

    it("Formats with day of week", () => {
      // 2025-01-06 is Monday
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyy-MM-dd (ddd)")).toBe("2025-01-06 (월)");
    });
  });

  describe("toString()", () => {
    it("Returns default format yyyy-MM-dd", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toString()).toBe("2025-01-06");
    });
  });

  //#endregion

  //#region tick comparison

  describe("tick comparison", () => {
    it("Same dates have same tick", () => {
      const d1 = new DateOnly(2025, 3, 15);
      const d2 = new DateOnly(2025, 3, 15);

      expect(d1.tick).toBe(d2.tick);
    });

    it("Different dates have different ticks", () => {
      const d1 = new DateOnly(2025, 3, 15);
      const d2 = new DateOnly(2025, 3, 16);

      expect(d1.tick).not.toBe(d2.tick);
    });

    it("Can compare date order by tick", () => {
      const d1 = new DateOnly(2025, 1, 1);
      const d2 = new DateOnly(2025, 6, 15);
      const d3 = new DateOnly(2025, 12, 31);

      expect(d1.tick).toBeLessThan(d2.tick);
      expect(d2.tick).toBeLessThan(d3.tick);
    });

    it("Can compare dates with different years by tick", () => {
      const d2024 = new DateOnly(2024, 12, 31);
      const d2025 = new DateOnly(2025, 1, 1);

      expect(d2024.tick).toBeLessThan(d2025.tick);
    });
  });

  //#endregion

  //#region Week calculation

  describe("getWeekSeqOfYear()", () => {
    describe("ISO 8601 standard (Monday start, first week min 4 days)", () => {
      it("Returns week sequence in middle of year", () => {
        // 2025-01-06 (Monday)
        const dateOnly = new DateOnly(2025, 1, 6);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(2);
      });

      it("Handles year-start when within week 1 of current year", () => {
        // 2025-01-01 (Wednesday) - ISO 8601, January 2 (Thursday) is in same week, so 2025 week 1
        const dateOnly = new DateOnly(2025, 1, 1);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(1);
      });

      it("Handles year-end when belonging to next year's week", () => {
        // 2024-12-30 (Monday) - Same week has 2025 January 2 (Thursday), so 2025 week 1
        const dateOnly = new DateOnly(2024, 12, 30);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(1);
      });
    });

    describe("US style (Sunday start, first week min 1 day)", () => {
      it("Year's first day belongs to week 1", () => {
        // 2025-01-01 (Wednesday)
        const dateOnly = new DateOnly(2025, 1, 1);
        const result = dateOnly.getWeekSeqOfYear(0, 1);

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(1);
      });

      it("Returns week sequence in middle of year", () => {
        // 2025-01-12 (Sunday) - US style week 3 start
        const dateOnly = new DateOnly(2025, 1, 12);
        const result = dateOnly.getWeekSeqOfYear(0, 1);

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(3);
      });
    });

    describe("Leap year handling", () => {
      it("Handles February 29 in leap year", () => {
        // 2024 is leap year, 2024-02-29 (Thursday)
        const dateOnly = new DateOnly(2024, 2, 29);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2024);
        expect(result.weekSeq).toBe(9);
      });
    });
  });

  describe("getWeekSeqOfMonth()", () => {
    describe("ISO 8601 standard (Monday start, first week min 4 days)", () => {
      it("Returns week sequence in middle of month", () => {
        // 2025-01-15 (Wednesday)
        const dateOnly = new DateOnly(2025, 1, 15);
        const result = dateOnly.getWeekSeqOfMonth();

        expect(result.year).toBe(2025);
        expect(result.monthSeq).toBe(1);
        expect(result.weekSeq).toBe(3);
      });

      it("Handles month-start when belonging to previous month's week", () => {
        // 2025-02-01 (Saturday) - Belongs to January's last week
        const dateOnly = new DateOnly(2025, 2, 1);
        const result = dateOnly.getWeekSeqOfMonth();

        // February 1 is Saturday, doesn't meet 4-day minimum, so January week
        expect(result.monthSeq).toBe(1);
      });

      it("Handles month-end when potentially belonging to next month's week", () => {
        // 2025-01-30 (Thursday) - Can belong to February week
        const dateOnly = new DateOnly(2025, 1, 30);
        const result = dateOnly.getWeekSeqOfMonth();

        expect(result.year).toBe(2025);
      });
    });

    describe("US style (Sunday start, first week min 1 day)", () => {
      it("Month's first day belongs to week 1", () => {
        // 2025-01-01 (Wednesday)
        const dateOnly = new DateOnly(2025, 1, 1);
        const result = dateOnly.getWeekSeqOfMonth(0, 1);

        expect(result.year).toBe(2025);
        expect(result.monthSeq).toBe(1);
        expect(result.weekSeq).toBe(1);
      });
    });
  });

  describe("getBaseYearMonthSeqForWeekSeq()", () => {
    it("Returns current year-month for general date", () => {
      const dateOnly = new DateOnly(2025, 1, 15);
      const result = dateOnly.getBaseYearMonthSeqForWeekSeq();

      expect(result.year).toBe(2025);
      expect(result.monthSeq).toBe(1);
    });

    it("Can return previous month at month boundary", () => {
      // May vary based on week start day
      const dateOnly = new DateOnly(2025, 2, 1);
      const result = dateOnly.getBaseYearMonthSeqForWeekSeq();

      // 2025-02-01 is Saturday, so may belong to January week
      expect(result.year).toBe(2025);
    });
  });

  describe("getWeekSeqStartDate()", () => {
    describe("ISO 8601 standard (Monday start)", () => {
      it("Returns week start date (Monday)", () => {
        // 2025-01-08 (Wednesday)
        const dateOnly = new DateOnly(2025, 1, 8);
        const result = dateOnly.getWeekSeqStartDate();

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(6); // Monday
        expect(result.dayOfWeek).toBe(1);
      });

      it("Returns same date if already Monday", () => {
        // 2025-01-06 (Monday)
        const dateOnly = new DateOnly(2025, 1, 6);
        const result = dateOnly.getWeekSeqStartDate();

        expect(result.day).toBe(6);
      });
    });

    describe("US style (Sunday start)", () => {
      it("Returns week start date (Sunday)", () => {
        // 2025-01-08 (Wednesday)
        const dateOnly = new DateOnly(2025, 1, 8);
        const result = dateOnly.getWeekSeqStartDate(0, 1);

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(5); // Sunday
        expect(result.dayOfWeek).toBe(0);
      });
    });
  });

  describe("getDateByYearWeekSeq()", () => {
    describe("ISO 8601 standard", () => {
      it("Returns start date from year week sequence", () => {
        // 2025 week 2
        const result = DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 });

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(6); // 2025-01-06 (Monday)
      });

      it("Returns start date from year-month week sequence", () => {
        // 2025 January week 3
        const result = DateOnly.getDateByYearWeekSeq({ year: 2025, month: 1, weekSeq: 3 });

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(13); // 2025-01-13 (Monday)
      });
    });

    describe("US style", () => {
      it("Returns start date from year week sequence", () => {
        // 2025 week 1 (US style)
        const result = DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 1 }, 0, 1);

        expect(result.year).toBe(2024);
        expect(result.month).toBe(12);
        expect(result.day).toBe(29); // 2024-12-29 (Sunday)
      });
    });

    describe("Year boundary handling", () => {
      it("Handles year with 53 weeks", () => {
        // 2020 has 53 weeks (ISO 8601)
        const result = DateOnly.getDateByYearWeekSeq({ year: 2020, weekSeq: 53 });

        expect(result.year).toBe(2020);
        expect(result.month).toBe(12);
        expect(result.day).toBe(28); // 2020-12-28 (Monday)
      });
    });

    describe("Leap year handling", () => {
      it("Correctly calculates week for leap year", () => {
        // 2024 (leap year) week 10
        const result = DateOnly.getDateByYearWeekSeq({ year: 2024, weekSeq: 10 });

        expect(result.year).toBe(2024);
        expect(result.month).toBe(3);
        expect(result.day).toBe(4); // 2024-03-04 (Monday)
      });
    });
  });

  //#endregion
});
