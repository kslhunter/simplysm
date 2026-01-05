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
});
