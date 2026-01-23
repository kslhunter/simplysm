import { describe, it, expect } from "vitest";
import { DateTime } from "@simplysm/core-common";

describe("DateTime", () => {
  describe("constructor", () => {
    it("기본 생성자는 현재 시간을 사용한다", () => {
      const before = Date.now();
      const dt = new DateTime();
      const after = Date.now();

      expect(dt.tick).toBeGreaterThanOrEqual(before);
      expect(dt.tick).toBeLessThanOrEqual(after);
    });

    it("년월일시분초밀리초로 생성한다", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30, 45, 123);

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(15);
      expect(dt.hour).toBe(10);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
      expect(dt.millisecond).toBe(123);
    });

    it("tick으로 생성한다", () => {
      const tick = 1710489045123;
      const dt = new DateTime(tick);

      expect(dt.tick).toBe(tick);
    });

    it("Date 객체로 생성한다", () => {
      const date = new Date(2024, 2, 15, 10, 30, 45, 123);
      const dt = new DateTime(date);

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(15);
    });

    it("윤년 2월 29일을 생성한다", () => {
      const dt = new DateTime(2024, 2, 29);

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(2);
      expect(dt.day).toBe(29);
      expect(dt.isValid).toBe(true);
    });

    it("평년 2월 29일은 3월 1일로 자동 조정된다 (JS Date 동작)", () => {
      const dt = new DateTime(2023, 2, 29);

      expect(dt.year).toBe(2023);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(1);
    });

    it("유효하지 않은 월(13월)은 다음 해 1월로 자동 조정된다 (JS Date 동작)", () => {
      const dt = new DateTime(2024, 13, 1);

      expect(dt.year).toBe(2025);
      expect(dt.month).toBe(1);
      expect(dt.day).toBe(1);
    });
  });

  describe("parse()", () => {
    it("ISO 8601 형식을 파싱한다", () => {
      const dt = DateTime.parse("2024-03-15T10:30:45.123Z");

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(15);
    });

    it("yyyy-MM-dd HH:mm:ss 형식을 파싱한다", () => {
      const dt = DateTime.parse("2024-03-15 10:30:45");

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(15);
      expect(dt.hour).toBe(10);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
    });

    it("밀리초 포함 형식을 파싱한다", () => {
      const dt = DateTime.parse("2024-03-15 10:30:45.123");

      expect(dt.millisecond).toBe(123);
    });

    it("밀리초 1자리는 100ms 단위로 패딩한다 (ISO 8601)", () => {
      const dt = DateTime.parse("2024-03-15 10:30:45.1");

      expect(dt.millisecond).toBe(100);
    });

    it("밀리초 2자리는 10ms 단위로 패딩한다 (ISO 8601)", () => {
      const dt = DateTime.parse("2024-03-15 10:30:45.01");

      expect(dt.millisecond).toBe(10);
    });

    it("밀리초 3자리는 그대로 파싱한다", () => {
      const dt = DateTime.parse("2024-03-15 10:30:45.001");

      expect(dt.millisecond).toBe(1);
    });

    it("yyyyMMddHHmmss 형식을 파싱한다", () => {
      const dt = DateTime.parse("20240315103045");

      expect(dt.year).toBe(2024);
      expect(dt.month).toBe(3);
      expect(dt.day).toBe(15);
      expect(dt.hour).toBe(10);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
    });

    it("오전/오후 형식을 파싱한다", () => {
      const dtAm = DateTime.parse("2024-03-15 오전 10:30:45");
      expect(dtAm.hour).toBe(10);

      const dtPm = DateTime.parse("2024-03-15 오후 02:30:45");
      expect(dtPm.hour).toBe(14);
    });

    it("오후 12:00:00은 정오(12시)", () => {
      const dt = DateTime.parse("2024-03-15 오후 12:00:00");

      expect(dt.hour).toBe(12);
      expect(dt.minute).toBe(0);
      expect(dt.second).toBe(0);
    });

    it("오전 12:00:00은 자정(0시)", () => {
      const dt = DateTime.parse("2024-03-15 오전 12:00:00");

      expect(dt.hour).toBe(0);
      expect(dt.minute).toBe(0);
      expect(dt.second).toBe(0);
    });

    it("오후 12:30:45는 정오 이후(12시 30분 45초)", () => {
      const dt = DateTime.parse("2024-03-15 오후 12:30:45");

      expect(dt.hour).toBe(12);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
    });

    it("오전 12:30:45는 자정 이후(0시 30분 45초)", () => {
      const dt = DateTime.parse("2024-03-15 오전 12:30:45");

      expect(dt.hour).toBe(0);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
    });

    it("잘못된 형식은 에러를 던진다", () => {
      expect(() => DateTime.parse("invalid")).toThrow();
    });
  });

  describe("불변성", () => {
    it("setYear는 새 인스턴스를 반환한다", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = dt1.setYear(2025);

      expect(dt1.year).toBe(2024);
      expect(dt2.year).toBe(2025);
      expect(dt1).not.toBe(dt2);
    });

    it("setMonth는 새 인스턴스를 반환한다", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = dt1.setMonth(6);

      expect(dt1.month).toBe(3);
      expect(dt2.month).toBe(6);
    });

    it("setMonth는 마지막 날짜를 조정한다", () => {
      // 1월 31일 → 2월 (28일 또는 29일로 조정)
      const dt1 = new DateTime(2024, 1, 31);
      const dt2 = dt1.setMonth(2);

      expect(dt2.month).toBe(2);
      expect(dt2.day).toBe(29); // 2024는 윤년
    });

    it("setMonth(13)은 다음 해 1월을 반환한다", () => {
      const dt = new DateTime(2024, 6, 15);
      const result = dt.setMonth(13);

      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.day).toBe(15);
    });

    it("setMonth(0)은 이전 해 12월을 반환한다", () => {
      const dt = new DateTime(2024, 6, 15);
      const result = dt.setMonth(0);

      expect(result.year).toBe(2023);
      expect(result.month).toBe(12);
      expect(result.day).toBe(15);
    });

    it("setMonth(-1)은 이전 해 11월을 반환한다", () => {
      const dt = new DateTime(2024, 6, 15);
      const result = dt.setMonth(-1);

      expect(result.year).toBe(2023);
      expect(result.month).toBe(11);
      expect(result.day).toBe(15);
    });

    it("setMonth(25)는 2년 후 1월을 반환한다", () => {
      const dt = new DateTime(2024, 6, 15);
      const result = dt.setMonth(25);

      expect(result.year).toBe(2026);
      expect(result.month).toBe(1);
      expect(result.day).toBe(15);
    });

    it("setMonth(-13)은 2년 전 11월을 반환한다", () => {
      const dt = new DateTime(2024, 6, 15);
      const result = dt.setMonth(-13);

      expect(result.year).toBe(2022);
      expect(result.month).toBe(11);
      expect(result.day).toBe(15);
    });
  });

  describe("산술 메서드", () => {
    it("addYears", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = dt1.addYears(2);

      expect(dt2.year).toBe(2026);
      expect(dt1.year).toBe(2024); // 원본 불변
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

  //#region tick 비교

  describe("tick 비교", () => {
    it("같은 날짜시간은 같은 tick을 가진다", () => {
      const dt1 = new DateTime(2025, 3, 15, 10, 30, 45, 123);
      const dt2 = new DateTime(2025, 3, 15, 10, 30, 45, 123);

      expect(dt1.tick).toBe(dt2.tick);
    });

    it("다른 날짜시간은 다른 tick을 가진다", () => {
      const dt1 = new DateTime(2025, 3, 15, 10, 30, 45, 123);
      const dt2 = new DateTime(2025, 3, 15, 10, 30, 45, 124);

      expect(dt1.tick).not.toBe(dt2.tick);
    });

    it("tick으로 날짜시간 순서를 비교할 수 있다", () => {
      const dt1 = new DateTime(2025, 1, 1, 0, 0, 0);
      const dt2 = new DateTime(2025, 6, 15, 12, 30, 0);
      const dt3 = new DateTime(2025, 12, 31, 23, 59, 59);

      expect(dt1.tick).toBeLessThan(dt2.tick);
      expect(dt2.tick).toBeLessThan(dt3.tick);
    });

    it("밀리초 단위 비교가 가능하다", () => {
      const dt1 = new DateTime(2025, 3, 15, 10, 30, 45, 0);
      const dt2 = new DateTime(2025, 3, 15, 10, 30, 45, 1);

      expect(dt2.tick - dt1.tick).toBe(1);
    });
  });

  //#endregion

  describe("timezoneOffsetMinutes", () => {
    it("현재 타임존 오프셋을 반환한다", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30, 45);
      const expected = new Date().getTimezoneOffset() * -1;

      expect(dt.timezoneOffsetMinutes).toBe(expected);
    });
  });

  describe("dayOfWeek", () => {
    it("요일을 반환한다 (일~토: 0~6)", () => {
      // 2024-03-15는 금요일 (5)
      const dt = new DateTime(2024, 3, 15);

      expect(dt.dayOfWeek).toBe(5);
    });
  });

  describe("isValid", () => {
    it("유효한 날짜시간은 true를 반환한다", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30, 45);
      expect(dt.isValid).toBe(true);
    });

    it("유효하지 않은 날짜시간은 false를 반환한다", () => {
      const dt = new DateTime(NaN);
      expect(dt.isValid).toBe(false);
    });

    it("기본 생성자는 유효한 날짜시간이다", () => {
      const dt = new DateTime();
      expect(dt.isValid).toBe(true);
    });
  });

  describe("toFormatString()", () => {
    it("yyyy-MM-dd 형식", () => {
      const dt = new DateTime(2024, 3, 5);

      expect(dt.toFormatString("yyyy-MM-dd")).toBe("2024-03-05");
    });

    it("HH:mm:ss 형식", () => {
      const dt = new DateTime(2024, 3, 5, 9, 5, 3);

      expect(dt.toFormatString("HH:mm:ss")).toBe("09:05:03");
    });
  });

  describe("toString()", () => {
    it("ISO 8601 형식으로 반환한다", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30, 45, 123);
      const str = dt.toString();

      expect(str).toMatch(/^2024-03-15T10:30:45\.123[+-]\d{2}:\d{2}$/);
    });
  });
});
