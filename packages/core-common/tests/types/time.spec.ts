import { describe, it, expect } from "vitest";
import { Time } from "@simplysm/core-common";

describe("Time", () => {
  //#region Constructor

  describe("constructor", () => {
    it("Returns current time when created without arguments", () => {
      const time = new Time();

      // Time changes in real-time so range test
      expect(time.hour).toBeGreaterThanOrEqual(0);
      expect(time.hour).toBeLessThanOrEqual(23);
      expect(time.minute).toBeGreaterThanOrEqual(0);
      expect(time.minute).toBeLessThanOrEqual(59);
    });

    it("Creates with hour, minute, second", () => {
      const time = new Time(15, 30, 45);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(0);
    });

    it("Creates with hour, minute, second, millisecond", () => {
      const time = new Time(15, 30, 45, 123);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("Creates with tick (millisecond)", () => {
      // 15:30:45.123 = (15*60*60 + 30*60 + 45)*1000 + 123
      const tick = (15 * 60 * 60 + 30 * 60 + 45) * 1000 + 123;
      const time = new Time(tick);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("Creates with Date type", () => {
      const date = new Date(2025, 0, 6, 15, 30, 45, 123);
      const time = new Time(date);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("Normalizes to 24 hours if exceeds", () => {
      // 25 hours = 1 hour
      const time = new Time(25, 0, 0);

      expect(time.hour).toBe(1);
    });

    it("Normalizes negative hours/minutes/seconds to within 24 hours", () => {
      // -1 hour 30 minutes = 23 hours 30 minutes (24 - 0.5 = 23.5)
      const time = new Time(-1, 30, 0);

      expect(time.hour).toBe(23);
      expect(time.minute).toBe(30);
    });

    it("Normalizes negative tick to within 24 hours", () => {
      // -1 hour = -3600000ms → 23 hours
      const time = new Time(-3600000);

      expect(time.hour).toBe(23);
      expect(time.minute).toBe(0);
      expect(time.second).toBe(0);
    });

    it("Negative tick (-1ms) normalizes to 23:59:59.999", () => {
      const time = new Time(-1);

      expect(time.hour).toBe(23);
      expect(time.minute).toBe(59);
      expect(time.second).toBe(59);
      expect(time.millisecond).toBe(999);
    });
  });

  //#endregion

  //#region parse

  describe("parse()", () => {
    it("Parses HH:mm:ss format", () => {
      const time = Time.parse("15:30:45");

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(0);
    });

    it("Parses HH:mm:ss.fff format", () => {
      const time = Time.parse("15:30:45.123");

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("Parses AM HH:mm:ss format", () => {
      const time = Time.parse("AM 9:30:45");

      expect(time.hour).toBe(9);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("Parses PM HH:mm:ss format", () => {
      const time = Time.parse("PM 3:30:45");

      expect(time.hour).toBe(15); // 12 + 3
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("Pads milliseconds with 0 if insufficient digits", () => {
      const time = Time.parse("15:30:45.1");

      expect(time.millisecond).toBe(100); // '1' → '100'
    });

    it("Throws error for invalid format", () => {
      expect(() => Time.parse("invalid-time")).toThrow();
    });

    it("PM 12:00:00 is noon (12 o'clock)", () => {
      const time = Time.parse("PM 12:00:00");

      expect(time.hour).toBe(12);
      expect(time.minute).toBe(0);
      expect(time.second).toBe(0);
    });

    it("AM 12:00:00 is midnight (0 o'clock)", () => {
      const time = Time.parse("AM 12:00:00");

      expect(time.hour).toBe(0);
      expect(time.minute).toBe(0);
      expect(time.second).toBe(0);
    });

    it("PM 12:30:45 is after noon (12:30:45)", () => {
      const time = Time.parse("PM 12:30:45");

      expect(time.hour).toBe(12);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("AM 12:30:45 is after midnight (0:30:45)", () => {
      const time = Time.parse("AM 12:30:45");

      expect(time.hour).toBe(0);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("Parses time from ISO 8601 format (UTC -> local conversion)", () => {
      // UTC time is converted to local time
      const time = Time.parse("2025-01-15T10:30:45Z");
      const expected = new Date("2025-01-15T10:30:45Z");

      expect(time.hour).toBe(expected.getHours());
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("Parses milliseconds from ISO 8601 format (UTC -> local conversion)", () => {
      // UTC time is converted to local time
      const time = Time.parse("2025-01-15T10:30:45.123Z");
      const expected = new Date("2025-01-15T10:30:45.123Z");

      expect(time.hour).toBe(expected.getHours());
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });
  });

  //#endregion

  //#region Getters

  describe("Getters", () => {
    it("Returns hour", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.hour).toBe(15);
    });

    it("Returns minute", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.minute).toBe(30);
    });

    it("Returns second", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.second).toBe(45);
    });

    it("Returns millisecond", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.millisecond).toBe(123);
    });

    it("Returns tick", () => {
      const time = new Time(15, 30, 45, 123);
      const expectedTick = (15 * 60 * 60 + 30 * 60 + 45) * 1000 + 123;
      expect(time.tick).toBe(expectedTick);
    });
  });

  //#endregion

  //#region tick comparison

  describe("tick comparison", () => {
    it("Same times have same tick", () => {
      const t1 = new Time(10, 30, 45, 123);
      const t2 = new Time(10, 30, 45, 123);

      expect(t1.tick).toBe(t2.tick);
    });

    it("Different times have different ticks", () => {
      const t1 = new Time(10, 30, 45, 123);
      const t2 = new Time(10, 30, 45, 124);

      expect(t1.tick).not.toBe(t2.tick);
    });

    it("Can compare time order by tick", () => {
      const t1 = new Time(0, 0, 0);
      const t2 = new Time(12, 30, 0);
      const t3 = new Time(23, 59, 59);

      expect(t1.tick).toBeLessThan(t2.tick);
      expect(t2.tick).toBeLessThan(t3.tick);
    });

    it("Millisecond precision comparison is possible", () => {
      const t1 = new Time(10, 30, 45, 0);
      const t2 = new Time(10, 30, 45, 1);

      expect(t2.tick - t1.tick).toBe(1);
    });

    it("Can calculate time difference by tick", () => {
      const t1 = new Time(10, 0, 0);
      const t2 = new Time(11, 0, 0);

      // 1 hour = 3600000ms
      expect(t2.tick - t1.tick).toBe(3600000);
    });
  });

  //#endregion

  //#region setX methods (immutable)

  describe("setHour()", () => {
    it("Returns new instance with hour changed", () => {
      const time = new Time(15, 30, 45, 123);
      const newTime = time.setHour(20);

      expect(newTime.hour).toBe(20);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(45);
      expect(newTime.millisecond).toBe(123);
      expect(time.hour).toBe(15); // original immutable
    });
  });

  describe("setMinute()", () => {
    it("Returns new instance with minute changed", () => {
      const time = new Time(15, 30, 45, 123);
      const newTime = time.setMinute(50);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(50);
      expect(newTime.second).toBe(45);
      expect(newTime.millisecond).toBe(123);
      expect(time.minute).toBe(30); // original immutable
    });
  });

  describe("setSecond()", () => {
    it("Returns new instance with second changed", () => {
      const time = new Time(15, 30, 45, 123);
      const newTime = time.setSecond(55);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(55);
      expect(newTime.millisecond).toBe(123);
      expect(time.second).toBe(45); // original immutable
    });
  });

  describe("setMillisecond()", () => {
    it("Returns new instance with millisecond changed", () => {
      const time = new Time(15, 30, 45, 123);
      const newTime = time.setMillisecond(456);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(45);
      expect(newTime.millisecond).toBe(456);
      expect(time.millisecond).toBe(123); // original immutable
    });
  });

  //#endregion

  //#region addX methods (immutable)

  describe("addHours()", () => {
    it("Adds positive hours", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addHours(3);

      expect(newTime.hour).toBe(18);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(45);
    });

    it("Adds negative hours (subtraction)", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addHours(-5);

      expect(newTime.hour).toBe(10);
    });

    it("Keeps remainder if exceeds 24 hours", () => {
      const time = new Time(22, 0, 0);
      const newTime = time.addHours(5);

      expect(newTime.hour).toBe(3); // (22 + 5) % 24
    });
  });

  describe("addMinutes()", () => {
    it("Adds positive minutes", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addMinutes(20);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(50);
    });

    it("Adds negative minutes (subtraction)", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addMinutes(-20);

      expect(newTime.minute).toBe(10);
    });

    it("Increases hour if exceeds 60 minutes", () => {
      const time = new Time(15, 50, 0);
      const newTime = time.addMinutes(20);

      expect(newTime.hour).toBe(16);
      expect(newTime.minute).toBe(10);
    });
  });

  describe("addSeconds()", () => {
    it("Adds positive seconds", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addSeconds(10);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(55);
    });

    it("Adds negative seconds (subtraction)", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addSeconds(-10);

      expect(newTime.second).toBe(35);
    });

    it("Increases minute if exceeds 60 seconds", () => {
      const time = new Time(15, 30, 50);
      const newTime = time.addSeconds(20);

      expect(newTime.minute).toBe(31);
      expect(newTime.second).toBe(10);
    });
  });

  describe("addMilliseconds()", () => {
    it("Adds positive milliseconds", () => {
      const time = new Time(15, 30, 45, 100);
      const newTime = time.addMilliseconds(50);

      expect(newTime.millisecond).toBe(150);
    });

    it("Adds negative milliseconds (subtraction)", () => {
      const time = new Time(15, 30, 45, 100);
      const newTime = time.addMilliseconds(-50);

      expect(newTime.millisecond).toBe(50);
    });

    it("Increases second if exceeds 1000 milliseconds", () => {
      const time = new Time(15, 30, 45, 900);
      const newTime = time.addMilliseconds(200);

      expect(newTime.second).toBe(46);
      expect(newTime.millisecond).toBe(100);
    });
  });

  //#endregion

  //#region Negative operations (24-hour boundary handling)

  describe("Negative operations (24-hour boundary)", () => {
    it("addHours(-25) is same time yesterday (23 hours ago)", () => {
      // Subtracting 25 hours from 10:00 = previous day 9:00 = 24 - 25 + 10 = 9:00
      const time = new Time(10, 0, 0);
      const newTime = time.addHours(-25);

      expect(newTime.hour).toBe(9);
      expect(newTime.minute).toBe(0);
      expect(newTime.second).toBe(0);
    });

    it("addHours(-10) crosses midnight to previous day", () => {
      // Subtracting 10 hours from 5:00 = 19:00
      const time = new Time(5, 0, 0);
      const newTime = time.addHours(-10);

      expect(newTime.hour).toBe(19);
    });

    it("addMinutes(-90) is 1 hour 30 minutes ago", () => {
      // Subtracting 90 minutes from 1:30 = 0:00
      const time = new Time(1, 30, 0);
      const newTime = time.addMinutes(-90);

      expect(newTime.hour).toBe(0);
      expect(newTime.minute).toBe(0);
    });

    it("addMinutes(-90) crosses midnight to previous day", () => {
      // Subtracting 90 minutes from 0:30 = previous day 23:00
      const time = new Time(0, 30, 0);
      const newTime = time.addMinutes(-90);

      expect(newTime.hour).toBe(23);
      expect(newTime.minute).toBe(0);
    });

    it("addSeconds(-3700) is about 1 hour ago", () => {
      // Subtracting 3700 seconds (1 hour 1 minute 40 seconds) from 1:00:00 = 23:58:20
      const time = new Time(1, 0, 0);
      const newTime = time.addSeconds(-3700);

      expect(newTime.hour).toBe(23);
      expect(newTime.minute).toBe(58);
      expect(newTime.second).toBe(20);
    });

    it("addMilliseconds(-1000) crosses midnight to previous day", () => {
      // Subtracting 1000ms from 0:00:00.500ms = previous day 23:59:59.500ms
      const time = new Time(0, 0, 0, 500);
      const newTime = time.addMilliseconds(-1000);

      expect(newTime.hour).toBe(23);
      expect(newTime.minute).toBe(59);
      expect(newTime.second).toBe(59);
      expect(newTime.millisecond).toBe(500);
    });
  });

  //#endregion

  //#region isValid

  describe("isValid", () => {
    it("Valid time returns true", () => {
      const time = new Time(15, 30, 45);
      expect(time.isValid).toBe(true);
    });

    it("Default constructor is valid time", () => {
      const time = new Time();
      expect(time.isValid).toBe(true);
    });

    it("Time created with tick is valid", () => {
      const tick = (15 * 60 * 60 + 30 * 60 + 45) * 1000;
      const time = new Time(tick);
      expect(time.isValid).toBe(true);
    });

    it("Time created with NaN tick has isValid false", () => {
      const time = new Time(NaN);
      expect(time.isValid).toBe(false);
    });
  });

  //#endregion

  //#region Formatting

  describe("toFormatString()", () => {
    it("Formats to HH:mm:ss format", () => {
      const time = new Time(15, 30, 45);
      expect(time.toFormatString("HH:mm:ss")).toBe("15:30:45");
    });

    it("Formats to HH:mm:ss.fff format", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.toFormatString("HH:mm:ss.fff")).toBe("15:30:45.123");
    });

    it("Formats to tt hh:mm:ss format (AM)", () => {
      const time = new Time(9, 30, 45);
      expect(time.toFormatString("tt hh:mm:ss")).toBe("AM 09:30:45");
    });

    it("Formats to tt hh:mm:ss format (PM)", () => {
      const time = new Time(15, 30, 45);
      expect(time.toFormatString("tt hh:mm:ss")).toBe("PM 03:30:45");
    });

    it("Formats to H:m:s format (no padding)", () => {
      const time = new Time(9, 5, 3);
      expect(time.toFormatString("H:m:s")).toBe("9:5:3");
    });
  });

  describe("toString()", () => {
    it("Returns default format HH:mm:ss.fff", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.toString()).toBe("15:30:45.123");
    });
  });

  //#endregion
});
