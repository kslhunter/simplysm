import { describe, it, expect } from "vitest";
import { DateTime } from "@simplysm/core-common";

describe("DateTime", () => {
  describe("constructor", () => {
    it("default constructor uses current time", () => {
      const before = Date.now();
      const dt = new DateTime();
      const after = Date.now();

      expect(dt.tick).toBeGreaterThanOrEqual(before);
      expect(dt.tick).toBeLessThanOrEqual(after);
    });

    it("creates with year, month, day, hour, minute, second, millisecond", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30, 45, 123);

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(15);
      expect(dt.hour).toBe(10);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
      expect(dt.millisecond).toBe(123);
    });

    it("creates with tick", () => {
      const tick = 1710489045123;
      const dt = new DateTime(tick);

      expect(dt.tick).toBe(tick);
    });

    it("creates with Date object", () => {
      const date = new Date(2024, 2, 15, 10, 30, 45, 123);
      const dt = new DateTime(date);

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(15);
    });

    it("creates leap year February 29th", () => {
      const dt = new DateTime(2024, 2, 29);

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(2);
      expect(dt.day).toBe(29);
      expect(dt.isValid).toBe(true);
    });

    it("non-leap year February 29th auto-adjusts to March 1st (JS Date behavior)", () => {
      const dt = new DateTime(2023, 2, 29);

      expect(dt.year).toBe(2023);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(1);
    });

    it("invalid month (13) auto-adjusts to next year January 1st (JS Date behavior)", () => {
      const dt = new DateTime(2024, 13, 1);

      expect(dt.year).toBe(2025);
      expect(dt.month).toBe(1);
      expect(dt.day).toBe(1);
    });
  });

  describe("parse()", () => {
    it("parses ISO 8601 format", () => {
      const dt = DateTime.parse("2024-03-15T10:30:45.123Z");

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(15);
    });

    it("parses yyyy-MM-dd HH:mm:ss format", () => {
      const dt = DateTime.parse("2024-03-15 10:30:45");

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(15);
      expect(dt.hour).toBe(10);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
    });

    it("parses format with milliseconds", () => {
      const dt = DateTime.parse("2024-03-15 10:30:45.123");

      expect(dt.millisecond).toBe(123);
    });

    it("pads 1-digit milliseconds to 100ms unit (ISO 8601)", () => {
      const dt = DateTime.parse("2024-03-15 10:30:45.1");

      expect(dt.millisecond).toBe(100);
    });

    it("pads 2-digit milliseconds to 10ms unit (ISO 8601)", () => {
      const dt = DateTime.parse("2024-03-15 10:30:45.01");

      expect(dt.millisecond).toBe(10);
    });

    it("parses 3-digit milliseconds as-is", () => {
      const dt = DateTime.parse("2024-03-15 10:30:45.001");

      expect(dt.millisecond).toBe(1);
    });

    it("parses yyyyMMddHHmmss format", () => {
      const dt = DateTime.parse("20240315103045");

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(15);
      expect(dt.hour).toBe(10);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
    });

    it("parses Korean AM/PM format", () => {
      const dtAm = DateTime.parse("2024-03-15 오전 10:30:45");
      expect(dtAm.hour).toBe(10);

      const dtPm = DateTime.parse("2024-03-15 오후 02:30:45");
      expect(dtPm.hour).toBe(14);
    });

    it("PM 12:00:00 is noon (12 o'clock)", () => {
      const dt = DateTime.parse("2024-03-15 오후 12:00:00");

      expect(dt.hour).toBe(12);
      expect(dt.minute).toBe(0);
      expect(dt.second).toBe(0);
    });

    it("AM 12:00:00 is midnight (0 o'clock)", () => {
      const dt = DateTime.parse("2024-03-15 오전 12:00:00");

      expect(dt.hour).toBe(0);
      expect(dt.minute).toBe(0);
      expect(dt.second).toBe(0);
    });

    it("PM 12:30:45 is after noon (12:30:45)", () => {
      const dt = DateTime.parse("2024-03-15 오후 12:30:45");

      expect(dt.hour).toBe(12);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
    });

    it("AM 12:30:45 is after midnight (0:30:45)", () => {
      const dt = DateTime.parse("2024-03-15 오전 12:30:45");

      expect(dt.hour).toBe(0);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
    });

    it("throws error for invalid format", () => {
      expect(() => DateTime.parse("invalid")).toThrow();
    });
  });

  describe("Immutability", () => {
    it("setYear returns new instance", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = dt1.setYear(2025);

      expect(dt1.year).toBe(2024);
      expect(dt2.year).toBe(2025);
      expect(dt1).not.toBe(dt2);
    });

    it("setMonth returns new instance", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = dt1.setMonth(6);

      expect(dt1.month).toBe(3);
      expect(dt2.month).toBe(6);
    });

    it("setMonth adjusts to last day of target month", () => {
      // January 31st → February (adjusted to 28th or 29th)
      const dt1 = new DateTime(2024, 1, 31);
      const dt2 = dt1.setMonth(2);

      expect(dt2.month).toBe(2);
      expect(dt2.day).toBe(29); // 2024 is leap year
    });

    it("setMonth(13) returns next year January", () => {
      const dt = new DateTime(2024, 6, 15);
      const result = dt.setMonth(13);

      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.day).toBe(15);
    });

    it("setMonth(0) returns previous year December", () => {
      const dt = new DateTime(2024, 6, 15);
      const result = dt.setMonth(0);

      expect(result.year).toBe(2023);
      expect(result.month).toBe(12);
      expect(result.day).toBe(15);
    });

    it("setMonth(-1) returns previous year November", () => {
      const dt = new DateTime(2024, 6, 15);
      const result = dt.setMonth(-1);

      expect(result.year).toBe(2023);
      expect(result.month).toBe(11);
      expect(result.day).toBe(15);
    });

    it("setMonth(25) returns January 2 years later", () => {
      const dt = new DateTime(2024, 6, 15);
      const result = dt.setMonth(25);

      expect(result.year).toBe(2026);
      expect(result.month).toBe(1);
      expect(result.day).toBe(15);
    });

    it("setMonth(-13) returns November 2 years earlier", () => {
      const dt = new DateTime(2024, 6, 15);
      const result = dt.setMonth(-13);

      expect(result.year).toBe(2022);
      expect(result.month).toBe(11);
      expect(result.day).toBe(15);
    });
  });

  describe("Arithmetic Methods", () => {
    it("addYears", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = dt1.addYears(2);

      expect(dt2.year).toBe(2026);
      expect(dt1.year).toBe(2024); // original unchanged
    });

    it("addMonths", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = dt1.addMonths(3);

      expect(dt2.month).toBe(6);
    });

    it("addDays", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = dt1.addDays(20);

      expect(dt2.month).toBe(4);
      expect(dt2.day).toBe(4);
    });

    it("addHours", () => {
      const dt1 = new DateTime(2024, 3, 15, 10);
      const dt2 = dt1.addHours(5);

      expect(dt2.hour).toBe(15);
    });

    it("addMinutes", () => {
      const dt1 = new DateTime(2024, 3, 15, 10, 30);
      const dt2 = dt1.addMinutes(45);

      expect(dt2.hour).toBe(11);
      expect(dt2.minute).toBe(15);
    });

    it("addSeconds", () => {
      const dt1 = new DateTime(2024, 3, 15, 10, 30, 45);
      const dt2 = dt1.addSeconds(30);

      expect(dt2.minute).toBe(31);
      expect(dt2.second).toBe(15);
    });

    it("addMilliseconds", () => {
      const dt1 = new DateTime(2024, 3, 15, 10, 30, 45, 500);
      const dt2 = dt1.addMilliseconds(600);

      expect(dt2.second).toBe(46);
      expect(dt2.millisecond).toBe(100);
    });
  });

  //#region tick comparison

  describe("tick comparison", () => {
    it("same datetime has same tick", () => {
      const dt1 = new DateTime(2025, 3, 15, 10, 30, 45, 123);
      const dt2 = new DateTime(2025, 3, 15, 10, 30, 45, 123);

      expect(dt1.tick).toBe(dt2.tick);
    });

    it("different datetime has different tick", () => {
      const dt1 = new DateTime(2025, 3, 15, 10, 30, 45, 123);
      const dt2 = new DateTime(2025, 3, 15, 10, 30, 45, 124);

      expect(dt1.tick).not.toBe(dt2.tick);
    });

    it("can compare datetime order using tick", () => {
      const dt1 = new DateTime(2025, 1, 1, 0, 0, 0);
      const dt2 = new DateTime(2025, 6, 15, 12, 30, 0);
      const dt3 = new DateTime(2025, 12, 31, 23, 59, 59);

      expect(dt1.tick).toBeLessThan(dt2.tick);
      expect(dt2.tick).toBeLessThan(dt3.tick);
    });

    it("can compare millisecond precision", () => {
      const dt1 = new DateTime(2025, 3, 15, 10, 30, 45, 0);
      const dt2 = new DateTime(2025, 3, 15, 10, 30, 45, 1);

      expect(dt2.tick - dt1.tick).toBe(1);
    });
  });

  //#endregion

  describe("timezoneOffsetMinutes", () => {
    it("returns current timezone offset", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30, 45);
      const expected = new Date().getTimezoneOffset() * -1;

      expect(dt.timezoneOffsetMinutes).toBe(expected);
    });
  });

  describe("dayOfWeek", () => {
    it("returns day of week (Sun~Sat: 0~6)", () => {
      // 2024-03-15 is Friday (5)
      const dt = new DateTime(2024, 3, 15);

      expect(dt.dayOfWeek).toBe(5);
    });
  });

  describe("isValid", () => {
    it("valid datetime returns true", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30, 45);
      expect(dt.isValid).toBe(true);
    });

    it("invalid datetime returns false", () => {
      const dt = new DateTime(NaN);
      expect(dt.isValid).toBe(false);
    });

    it("default constructor is valid datetime", () => {
      const dt = new DateTime();
      expect(dt.isValid).toBe(true);
    });
  });

  describe("toFormatString()", () => {
    it("yyyy-MM-dd format", () => {
      const dt = new DateTime(2024, 3, 5);

      expect(dt.toFormatString("yyyy-MM-dd")).toBe("2024-03-05");
    });

    it("HH:mm:ss format", () => {
      const dt = new DateTime(2024, 3, 5, 9, 5, 3);

      expect(dt.toFormatString("HH:mm:ss")).toBe("09:05:03");
    });
  });

  describe("toString()", () => {
    it("returns ISO 8601 format", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30, 45, 123);
      const str = dt.toString();

      expect(str).toMatch(/^2024-03-15T10:30:45\.123[+-]\d{2}:\d{2}$/);
    });
  });
});
