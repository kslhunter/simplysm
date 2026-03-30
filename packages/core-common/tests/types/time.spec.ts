import { describe, it, expect } from "vitest";
import { Time } from "@simplysm/core-common";

describe("Time", () => {
  //#region Constructor

  describe("constructor", () => {
    it("인수 없이 생성 시 현재 시간 반환", () => {
      const time = new Time();

      // 시간이 실시간으로 변하므로 범위 테스트
      expect(time.hour).toBeGreaterThanOrEqual(0);
      expect(time.hour).toBeLessThanOrEqual(23);
      expect(time.minute).toBeGreaterThanOrEqual(0);
      expect(time.minute).toBeLessThanOrEqual(59);
    });

    it("시, 분, 초로 생성", () => {
      const time = new Time(15, 30, 45);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(0);
    });

    it("시, 분, 초, 밀리초로 생성", () => {
      const time = new Time(15, 30, 45, 123);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("tick(밀리초)으로 생성", () => {
      // 15:30:45.123 = (15*60*60 + 30*60 + 45)*1000 + 123
      const tick = (15 * 60 * 60 + 30 * 60 + 45) * 1000 + 123;
      const time = new Time(tick);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("Date 타입으로 생성", () => {
      const date = new Date(2025, 0, 6, 15, 30, 45, 123);
      const time = new Time(date);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("24시간 초과 시 정규화", () => {
      // 25 hours = 1 hour
      const time = new Time(25, 0, 0);

      expect(time.hour).toBe(1);
    });

    it("음수 시/분/초를 24시간 내로 정규화", () => {
      // -1 hour 30 minutes = 23 hours 30 minutes (24 - 0.5 = 23.5)
      const time = new Time(-1, 30, 0);

      expect(time.hour).toBe(23);
      expect(time.minute).toBe(30);
    });

    it("음수 tick을 24시간 내로 정규화", () => {
      // -1 hour = -3600000ms → 23 hours
      const time = new Time(-3600000);

      expect(time.hour).toBe(23);
      expect(time.minute).toBe(0);
      expect(time.second).toBe(0);
    });

    it("음수 tick (-1ms)이 23:59:59.999로 정규화", () => {
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
    it("HH:mm:ss 형식 파싱", () => {
      const time = Time.parse("15:30:45");

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(0);
    });

    it("HH:mm:ss.fff 형식 파싱", () => {
      const time = Time.parse("15:30:45.123");

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("AM HH:mm:ss 형식 파싱", () => {
      const time = Time.parse("AM 9:30:45");

      expect(time.hour).toBe(9);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("PM HH:mm:ss 형식 파싱", () => {
      const time = Time.parse("PM 3:30:45");

      expect(time.hour).toBe(15); // 12 + 3
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("밀리초 자릿수 부족 시 0으로 패딩", () => {
      const time = Time.parse("15:30:45.1");

      expect(time.millisecond).toBe(100); // '1' → '100'
    });

    it("잘못된 형식에 대해 오류 발생", () => {
      expect(() => Time.parse("invalid-time")).toThrow();
    });

    it("PM 12:00:00은 정오(12시)", () => {
      const time = Time.parse("PM 12:00:00");

      expect(time.hour).toBe(12);
      expect(time.minute).toBe(0);
      expect(time.second).toBe(0);
    });

    it("AM 12:00:00은 자정(0시)", () => {
      const time = Time.parse("AM 12:00:00");

      expect(time.hour).toBe(0);
      expect(time.minute).toBe(0);
      expect(time.second).toBe(0);
    });

    it("PM 12:30:45는 오후(12:30:45)", () => {
      const time = Time.parse("PM 12:30:45");

      expect(time.hour).toBe(12);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("AM 12:30:45는 자정 이후(0:30:45)", () => {
      const time = Time.parse("AM 12:30:45");

      expect(time.hour).toBe(0);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("ISO 8601 형식에서 시간 파싱 (UTC -> 로컬 변환)", () => {
      // UTC 시간이 로컬 시간으로 변환됨
      const time = Time.parse("2025-01-15T10:30:45Z");
      const expected = new Date("2025-01-15T10:30:45Z");

      expect(time.hour).toBe(expected.getHours());
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("ISO 8601 형식에서 밀리초 파싱 (UTC -> 로컬 변환)", () => {
      // UTC 시간이 로컬 시간으로 변환됨
      const time = Time.parse("2025-01-15T10:30:45.123Z");
      const expected = new Date("2025-01-15T10:30:45.123Z");

      expect(time.hour).toBe(expected.getHours());
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });
  });

  //#endregion

  //#region setX methods (immutable)

  describe("setMillisecond()", () => {
    it("밀리초가 변경된 새 인스턴스 반환", () => {
      const time = new Time(15, 30, 45, 123);
      const newTime = time.setMillisecond(456);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(45);
      expect(newTime.millisecond).toBe(456);
      expect(time.millisecond).toBe(123); // 원본 불변
    });
  });

  //#endregion

  //#region addX methods (immutable)

  describe("addHours()", () => {
    it("양수 시간 더하기", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addHours(3);

      expect(newTime.hour).toBe(18);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(45);
    });

    it("음수 시간 더하기 (빼기)", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addHours(-5);

      expect(newTime.hour).toBe(10);
    });

    it("24시간 초과 시 나머지 유지", () => {
      const time = new Time(22, 0, 0);
      const newTime = time.addHours(5);

      expect(newTime.hour).toBe(3); // (22 + 5) % 24
    });
  });

  describe("addMinutes()", () => {
    it("양수 분 더하기", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addMinutes(20);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(50);
    });

    it("음수 분 더하기 (빼기)", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addMinutes(-20);

      expect(newTime.minute).toBe(10);
    });

    it("60분 초과 시 시간 증가", () => {
      const time = new Time(15, 50, 0);
      const newTime = time.addMinutes(20);

      expect(newTime.hour).toBe(16);
      expect(newTime.minute).toBe(10);
    });
  });

  describe("addSeconds()", () => {
    it("양수 초 더하기", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addSeconds(10);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(55);
    });

    it("음수 초 더하기 (빼기)", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addSeconds(-10);

      expect(newTime.second).toBe(35);
    });

    it("60초 초과 시 분 증가", () => {
      const time = new Time(15, 30, 50);
      const newTime = time.addSeconds(20);

      expect(newTime.minute).toBe(31);
      expect(newTime.second).toBe(10);
    });
  });

  describe("addMilliseconds()", () => {
    it("양수 밀리초 더하기", () => {
      const time = new Time(15, 30, 45, 100);
      const newTime = time.addMilliseconds(50);

      expect(newTime.millisecond).toBe(150);
    });

    it("음수 밀리초 더하기 (빼기)", () => {
      const time = new Time(15, 30, 45, 100);
      const newTime = time.addMilliseconds(-50);

      expect(newTime.millisecond).toBe(50);
    });

    it("1000밀리초 초과 시 초 증가", () => {
      const time = new Time(15, 30, 45, 900);
      const newTime = time.addMilliseconds(200);

      expect(newTime.second).toBe(46);
      expect(newTime.millisecond).toBe(100);
    });
  });

  //#endregion

  //#region Negative operations (24-hour boundary handling)

  describe("음수 연산 (24시간 경계)", () => {
    it("addHours(-25)는 어제 같은 시간 (23시간 전)", () => {
      // Subtracting 25 hours from 10:00 = previous day 9:00 = 24 - 25 + 10 = 9:00
      const time = new Time(10, 0, 0);
      const newTime = time.addHours(-25);

      expect(newTime.hour).toBe(9);
      expect(newTime.minute).toBe(0);
      expect(newTime.second).toBe(0);
    });

    it("addHours(-10)는 자정을 넘어 전날로", () => {
      // Subtracting 10 hours from 5:00 = 19:00
      const time = new Time(5, 0, 0);
      const newTime = time.addHours(-10);

      expect(newTime.hour).toBe(19);
    });

    it("addMinutes(-90)는 1시간 30분 전", () => {
      // Subtracting 90 minutes from 1:30 = 0:00
      const time = new Time(1, 30, 0);
      const newTime = time.addMinutes(-90);

      expect(newTime.hour).toBe(0);
      expect(newTime.minute).toBe(0);
    });

    it("addMinutes(-90)는 자정을 넘어 전날로", () => {
      // Subtracting 90 minutes from 0:30 = previous day 23:00
      const time = new Time(0, 30, 0);
      const newTime = time.addMinutes(-90);

      expect(newTime.hour).toBe(23);
      expect(newTime.minute).toBe(0);
    });

    it("addSeconds(-3700)는 약 1시간 전", () => {
      // Subtracting 3700 seconds (1 hour 1 minute 40 seconds) from 1:00:00 = 23:58:20
      const time = new Time(1, 0, 0);
      const newTime = time.addSeconds(-3700);

      expect(newTime.hour).toBe(23);
      expect(newTime.minute).toBe(58);
      expect(newTime.second).toBe(20);
    });

    it("addMilliseconds(-1000)는 자정을 넘어 전날로", () => {
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
    it("NaN tick으로 생성된 Time의 isValid는 false", () => {
      const time = new Time(NaN);
      expect(time.isValid).toBe(false);
    });
  });

  //#endregion

  //#region Formatting

  describe("toFormatString()", () => {
    it("HH:mm:ss 형식으로 포맷", () => {
      const time = new Time(15, 30, 45);
      expect(time.toFormatString("HH:mm:ss")).toBe("15:30:45");
    });

    it("HH:mm:ss.fff 형식으로 포맷", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.toFormatString("HH:mm:ss.fff")).toBe("15:30:45.123");
    });

    it("tt hh:mm:ss 형식으로 포맷 (AM)", () => {
      const time = new Time(9, 30, 45);
      expect(time.toFormatString("tt hh:mm:ss")).toBe("AM 09:30:45");
    });

    it("tt hh:mm:ss 형식으로 포맷 (PM)", () => {
      const time = new Time(15, 30, 45);
      expect(time.toFormatString("tt hh:mm:ss")).toBe("PM 03:30:45");
    });

    it("H:m:s 형식으로 포맷 (패딩 없음)", () => {
      const time = new Time(9, 5, 3);
      expect(time.toFormatString("H:m:s")).toBe("9:5:3");
    });
  });

  describe("toString()", () => {
    it("기본 형식 HH:mm:ss.fff 반환", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.toString()).toBe("15:30:45.123");
    });
  });

  //#endregion
});
