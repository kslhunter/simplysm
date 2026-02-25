import { describe, it, expect } from "vitest";
import { formatDate, normalizeMonth } from "@simplysm/core-common";

describe("formatDateTime", () => {
  //#region Year pattern

  describe("Year pattern", () => {
    it("outputs 4-digit year with yyyy format", () => {
      expect(formatDate("yyyy", { year: 2025 })).toBe("2025");
    });

    it("outputs 2-digit year with yy format", () => {
      expect(formatDate("yy", { year: 2025 })).toBe("25");
      expect(formatDate("yy", { year: 2000 })).toBe("00");
      expect(formatDate("yy", { year: 1999 })).toBe("99");
    });
  });

  //#endregion

  //#region Month pattern

  describe("Month pattern", () => {
    it("outputs 2-digit month with MM format", () => {
      expect(formatDate("MM", { month: 1 })).toBe("01");
      expect(formatDate("MM", { month: 9 })).toBe("09");
      expect(formatDate("MM", { month: 12 })).toBe("12");
    });

    it("outputs month without padding with M format", () => {
      expect(formatDate("M", { month: 1 })).toBe("1");
      expect(formatDate("M", { month: 9 })).toBe("9");
      expect(formatDate("M", { month: 12 })).toBe("12");
    });
  });

  //#endregion

  //#region Day pattern

  describe("Day pattern", () => {
    it("outputs 2-digit day with dd format", () => {
      expect(formatDate("dd", { day: 1 })).toBe("01");
      expect(formatDate("dd", { day: 9 })).toBe("09");
      expect(formatDate("dd", { day: 31 })).toBe("31");
    });

    it("outputs day without padding with d format", () => {
      expect(formatDate("d", { day: 1 })).toBe("1");
      expect(formatDate("d", { day: 9 })).toBe("9");
      expect(formatDate("d", { day: 31 })).toBe("31");
    });
  });

  //#endregion

  //#region Day of week pattern

  describe("Day of week pattern", () => {
    it("outputs day of week in Korean with ddd format", () => {
      // 2025-01-18 is Saturday
      expect(formatDate("ddd", { year: 2025, month: 1, day: 18 })).toBe("토");
      // 2025-01-19 is Sunday
      expect(formatDate("ddd", { year: 2025, month: 1, day: 19 })).toBe("일");
      // 2025-01-20 is Monday
      expect(formatDate("ddd", { year: 2025, month: 1, day: 20 })).toBe("월");
    });
  });

  //#endregion

  //#region Hour pattern

  describe("Hour pattern", () => {
    it("outputs 12-hour format with padding using hh format", () => {
      expect(formatDate("hh", { hour: 0 })).toBe("12");
      expect(formatDate("hh", { hour: 1 })).toBe("01");
      expect(formatDate("hh", { hour: 12 })).toBe("12");
      expect(formatDate("hh", { hour: 13 })).toBe("01");
    });

    it("outputs 12-hour format without padding using h format", () => {
      expect(formatDate("h", { hour: 0 })).toBe("12");
      expect(formatDate("h", { hour: 1 })).toBe("1");
      expect(formatDate("h", { hour: 9 })).toBe("9");
      expect(formatDate("h", { hour: 10 })).toBe("10");
      expect(formatDate("h", { hour: 12 })).toBe("12");
      expect(formatDate("h", { hour: 13 })).toBe("1");
      expect(formatDate("h", { hour: 23 })).toBe("11");
    });

    it("outputs 24-hour format with padding using HH format", () => {
      expect(formatDate("HH", { hour: 0 })).toBe("00");
      expect(formatDate("HH", { hour: 9 })).toBe("09");
      expect(formatDate("HH", { hour: 23 })).toBe("23");
    });

    it("outputs 24-hour format without padding using H format", () => {
      expect(formatDate("H", { hour: 0 })).toBe("0");
      expect(formatDate("H", { hour: 9 })).toBe("9");
      expect(formatDate("H", { hour: 23 })).toBe("23");
    });

    it("outputs AM/PM with tt format", () => {
      expect(formatDate("tt", { hour: 0 })).toBe("AM");
      expect(formatDate("tt", { hour: 11 })).toBe("AM");
      expect(formatDate("tt", { hour: 12 })).toBe("PM");
      expect(formatDate("tt", { hour: 23 })).toBe("PM");
    });
  });

  //#endregion

  //#region Minute pattern

  describe("Minute pattern", () => {
    it("outputs 2-digit minute with mm format", () => {
      expect(formatDate("mm", { minute: 0 })).toBe("00");
      expect(formatDate("mm", { minute: 5 })).toBe("05");
      expect(formatDate("mm", { minute: 59 })).toBe("59");
    });

    it("outputs minute without padding with m format", () => {
      expect(formatDate("m", { minute: 0 })).toBe("0");
      expect(formatDate("m", { minute: 5 })).toBe("5");
      expect(formatDate("m", { minute: 59 })).toBe("59");
    });
  });

  //#endregion

  //#region Second pattern

  describe("Second pattern", () => {
    it("outputs 2-digit second with ss format", () => {
      expect(formatDate("ss", { second: 0 })).toBe("00");
      expect(formatDate("ss", { second: 5 })).toBe("05");
      expect(formatDate("ss", { second: 59 })).toBe("59");
    });

    it("outputs second without padding with s format", () => {
      expect(formatDate("s", { second: 0 })).toBe("0");
      expect(formatDate("s", { second: 5 })).toBe("5");
      expect(formatDate("s", { second: 59 })).toBe("59");
    });
  });

  //#endregion

  //#region Millisecond pattern

  describe("Millisecond pattern", () => {
    it("outputs 3-digit millisecond with fff format", () => {
      expect(formatDate("fff", { millisecond: 0 })).toBe("000");
      expect(formatDate("fff", { millisecond: 5 })).toBe("005");
      expect(formatDate("fff", { millisecond: 50 })).toBe("050");
      expect(formatDate("fff", { millisecond: 500 })).toBe("500");
      expect(formatDate("fff", { millisecond: 999 })).toBe("999");
    });

    it("outputs 2-digit millisecond with ff format", () => {
      expect(formatDate("ff", { millisecond: 0 })).toBe("00");
      expect(formatDate("ff", { millisecond: 5 })).toBe("00");
      expect(formatDate("ff", { millisecond: 50 })).toBe("05");
      expect(formatDate("ff", { millisecond: 500 })).toBe("50");
      expect(formatDate("ff", { millisecond: 999 })).toBe("99");
    });

    it("outputs 1-digit millisecond with f format", () => {
      expect(formatDate("f", { millisecond: 0 })).toBe("0");
      expect(formatDate("f", { millisecond: 5 })).toBe("0");
      expect(formatDate("f", { millisecond: 100 })).toBe("1");
      expect(formatDate("f", { millisecond: 500 })).toBe("5");
      expect(formatDate("f", { millisecond: 999 })).toBe("9");
    });
  });

  //#endregion

  //#region Timezone pattern

  describe("Timezone pattern", () => {
    describe("Positive offset (East)", () => {
      it("outputs +HH:mm format with zzz format", () => {
        // UTC+9 (540 minutes)
        expect(formatDate("zzz", { timezoneOffsetMinutes: 540 })).toBe("+09:00");
        // UTC+5:30 (330 minutes)
        expect(formatDate("zzz", { timezoneOffsetMinutes: 330 })).toBe("+05:30");
      });

      it("outputs +HH format with zz format", () => {
        expect(formatDate("zz", { timezoneOffsetMinutes: 540 })).toBe("+09");
        expect(formatDate("zz", { timezoneOffsetMinutes: 60 })).toBe("+01");
      });

      it("outputs +H format without padding with z format", () => {
        expect(formatDate("z", { timezoneOffsetMinutes: 540 })).toBe("+9");
        expect(formatDate("z", { timezoneOffsetMinutes: 60 })).toBe("+1");
        expect(formatDate("z", { timezoneOffsetMinutes: 600 })).toBe("+10");
      });
    });

    describe("Negative offset (West)", () => {
      it("outputs -HH:mm format with zzz format", () => {
        // UTC-5 (-300 minutes) - Integer hour offset
        expect(formatDate("zzz", { timezoneOffsetMinutes: -300 })).toBe("-05:00");
        // UTC-8 (-480 minutes) - Integer hour offset
        expect(formatDate("zzz", { timezoneOffsetMinutes: -480 })).toBe("-08:00");
        // UTC-3:30 (-210 minutes) - Newfoundland Standard Time
        expect(formatDate("zzz", { timezoneOffsetMinutes: -210 })).toBe("-03:30");
        // UTC-9:30 (-570 minutes) - Marquesas Islands
        expect(formatDate("zzz", { timezoneOffsetMinutes: -570 })).toBe("-09:30");
      });

      it("outputs -HH format with zz format", () => {
        expect(formatDate("zz", { timezoneOffsetMinutes: -300 })).toBe("-05");
        expect(formatDate("zz", { timezoneOffsetMinutes: -60 })).toBe("-01");
      });

      it("outputs -H format without padding with z format", () => {
        expect(formatDate("z", { timezoneOffsetMinutes: -300 })).toBe("-5");
        expect(formatDate("z", { timezoneOffsetMinutes: -60 })).toBe("-1");
        expect(formatDate("z", { timezoneOffsetMinutes: -720 })).toBe("-12");
      });
    });

    describe("UTC (0 offset)", () => {
      it("outputs +00:00 with zzz format", () => {
        expect(formatDate("zzz", { timezoneOffsetMinutes: 0 })).toBe("+00:00");
      });

      it("outputs +00 with zz format", () => {
        expect(formatDate("zz", { timezoneOffsetMinutes: 0 })).toBe("+00");
      });

      it("outputs +0 with z format", () => {
        expect(formatDate("z", { timezoneOffsetMinutes: 0 })).toBe("+0");
      });
    });
  });

  //#endregion

  //#endregion

  //#region Complex format

  describe("Complex format", () => {
    it("handles full date/time format", () => {
      const result = formatDate("yyyy-MM-dd HH:mm:ss.fff", {
        year: 2025,
        month: 1,
        day: 18,
        hour: 14,
        minute: 30,
        second: 45,
        millisecond: 123,
      });
      expect(result).toBe("2025-01-18 14:30:45.123");
    });

    it("handles 12-hour format", () => {
      const result = formatDate("yyyy-MM-dd tt h:mm:ss", {
        year: 2025,
        month: 1,
        day: 18,
        hour: 14,
        minute: 5,
        second: 9,
      });
      expect(result).toBe("2025-01-18 PM 2:05:09");
    });

    it("handles format with timezone", () => {
      const result = formatDate("yyyy-MM-ddTHH:mm:sszzz", {
        year: 2025,
        month: 1,
        day: 18,
        hour: 14,
        minute: 30,
        second: 0,
        timezoneOffsetMinutes: 540,
      });
      expect(result).toBe("2025-01-18T14:30:00+09:00");
    });
  });

  //#endregion
});

describe("normalizeMonth", () => {
  //#region Normal range

  describe("Normal range (1-12)", () => {
    it("Returns unchanged if month is within 1-12 range", () => {
      expect(normalizeMonth(2025, 1, 15)).toEqual({ year: 2025, month: 1, day: 15 });
      expect(normalizeMonth(2025, 6, 15)).toEqual({ year: 2025, month: 6, day: 15 });
      expect(normalizeMonth(2025, 12, 15)).toEqual({ year: 2025, month: 12, day: 15 });
    });
  });

  //#endregion

  //#region Month overflow

  describe("Month overflow (13 or more)", () => {
    it("Month 13 becomes January next year", () => {
      expect(normalizeMonth(2025, 13, 15)).toEqual({ year: 2026, month: 1, day: 15 });
    });

    it("Month 14 becomes February next year", () => {
      expect(normalizeMonth(2025, 14, 15)).toEqual({ year: 2026, month: 2, day: 15 });
    });

    it("Month 25 becomes January 2 years later", () => {
      expect(normalizeMonth(2025, 25, 15)).toEqual({ year: 2027, month: 1, day: 15 });
    });

    it("Month 24 becomes December next year", () => {
      expect(normalizeMonth(2025, 24, 15)).toEqual({ year: 2026, month: 12, day: 15 });
    });
  });

  //#endregion

  //#region Month underflow

  describe("Month underflow (0 or less)", () => {
    it("Month 0 becomes December previous year", () => {
      expect(normalizeMonth(2025, 0, 15)).toEqual({ year: 2024, month: 12, day: 15 });
    });

    it("Month -1 becomes November previous year", () => {
      expect(normalizeMonth(2025, -1, 15)).toEqual({ year: 2024, month: 11, day: 15 });
    });

    it("Month -11 becomes January previous year", () => {
      expect(normalizeMonth(2025, -11, 15)).toEqual({ year: 2024, month: 1, day: 15 });
    });

    it("Month -12 becomes December 2 years ago", () => {
      expect(normalizeMonth(2025, -12, 15)).toEqual({ year: 2023, month: 12, day: 15 });
    });

    it("Month -13 becomes November 2 years ago", () => {
      expect(normalizeMonth(2025, -13, 15)).toEqual({ year: 2023, month: 11, day: 15 });
    });
  });

  //#endregion

  //#region Day adjustment

  describe("Day adjustment (target month's last day)", () => {
    it("Day 31 adjusted to 28 when changing to February (non-leap year)", () => {
      expect(normalizeMonth(2025, 2, 31)).toEqual({ year: 2025, month: 2, day: 28 });
    });

    it("Day 31 adjusted to 29 when changing to February (leap year)", () => {
      expect(normalizeMonth(2024, 2, 31)).toEqual({ year: 2024, month: 2, day: 29 });
    });

    it("Day 31 adjusted to 30 when changing to April", () => {
      expect(normalizeMonth(2025, 4, 31)).toEqual({ year: 2025, month: 4, day: 30 });
    });

    it("Day unchanged if less than target month's day count", () => {
      expect(normalizeMonth(2025, 3, 15)).toEqual({ year: 2025, month: 3, day: 15 });
    });
  });

  //#endregion
});
