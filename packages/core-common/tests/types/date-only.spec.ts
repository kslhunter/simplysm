import { describe, it, expect } from "vitest";
import { DateOnly } from "@simplysm/core-common";

describe("DateOnly", () => {
  //#region 생성자

  describe("constructor", () => {
    it("인수 없이 생성하면 오늘 날짜를 반환한다", () => {
      const now = new Date();
      const dateOnly = new DateOnly();

      expect(dateOnly.year).toBe(now.getFullYear());
      expect(dateOnly.month).toBe(now.getMonth() + 1);
      expect(dateOnly.day).toBe(now.getDate());
    });

    it("연월일로 생성한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("tick (millisecond)로 생성한다", () => {
      const tick = new Date(2025, 0, 6).getTime();
      const dateOnly = new DateOnly(tick);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("Date 타입으로 생성한다", () => {
      const date = new Date(2025, 0, 6, 15, 30, 45);
      const dateOnly = new DateOnly(date);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("Date 타입으로 생성할 때 시간은 무시한다", () => {
      const date1 = new Date(2025, 0, 6, 0, 0, 0);
      const date2 = new Date(2025, 0, 6, 23, 59, 59);

      const dateOnly1 = new DateOnly(date1);
      const dateOnly2 = new DateOnly(date2);

      expect(dateOnly1.tick).toBe(dateOnly2.tick);
    });
  });

  //#endregion

  //#region parse

  describe("parse()", () => {
    it("yyyy-MM-dd 형식을 파싱한다", () => {
      const dateOnly = DateOnly.parse("2025-01-06");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("yyyyMMdd 형식을 파싱한다", () => {
      const dateOnly = DateOnly.parse("20250106");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("ISO 8601 형식을 파싱한다", () => {
      const dateOnly = DateOnly.parse("2025-01-06T00:00:00Z");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("잘못된 형식이면 에러를 던진다", () => {
      expect(() => DateOnly.parse("invalid-date")).toThrow("날짜 형식을 파싱할 수 없습니다");
    });
  });

  //#endregion

  //#region Getters

  describe("Getters", () => {
    it("year를 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.year).toBe(2025);
    });

    it("month를 반환한다 (1~12)", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.month).toBe(1);
    });

    it("day를 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.day).toBe(6);
    });

    it("tick을 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.tick).toBe(new Date(2025, 0, 6).getTime());
    });

    it("week을 반환한다 (일~토: 0~6)", () => {
      // 2025-01-06은 월요일 (1)
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.week).toBe(1);
    });

    it("isValidDate를 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.isValidDate).toBe(true);
    });
  });

  //#endregion

  //#region setX 메서드 (불변)

  describe("setYear()", () => {
    it("연도를 변경한 새 인스턴스를 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.setYear(2026);

      expect(newDateOnly.year).toBe(2026);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(6);
      expect(dateOnly.year).toBe(2025); // 원본 불변
    });
  });

  describe("setMonth()", () => {
    it("월을 변경한 새 인스턴스를 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.setMonth(2);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(6);
      expect(dateOnly.month).toBe(1); // 원본 불변
    });

    it("대상 월의 마지막 날보다 큰 경우 마지막 날로 조정한다", () => {
      // 1월 31일 → 2월 (28일까지)
      const dateOnly = new DateOnly(2025, 1, 31);
      const newDateOnly = dateOnly.setMonth(2);

      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(28); // 2월 마지막 날
    });

    it("setMonth(13)은 다음 해 1월을 반환한다", () => {
      const dateOnly = new DateOnly(2025, 6, 15);
      const result = dateOnly.setMonth(13);

      expect(result.year).toBe(2026);
      expect(result.month).toBe(1);
      expect(result.day).toBe(15);
    });

    it("setMonth(0)은 이전 해 12월을 반환한다", () => {
      const dateOnly = new DateOnly(2025, 6, 15);
      const result = dateOnly.setMonth(0);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(12);
      expect(result.day).toBe(15);
    });

    it("setMonth(-1)은 이전 해 11월을 반환한다", () => {
      const dateOnly = new DateOnly(2025, 6, 15);
      const result = dateOnly.setMonth(-1);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(11);
      expect(result.day).toBe(15);
    });
  });

  describe("setDay()", () => {
    it("일을 변경한 새 인스턴스를 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.setDay(15);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(15);
      expect(dateOnly.day).toBe(6); // 원본 불변
    });
  });

  //#endregion

  //#region addX 메서드 (불변)

  describe("addYears()", () => {
    it("양수 연도를 더한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addYears(2);

      expect(newDateOnly.year).toBe(2027);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(6);
    });

    it("음수 연도를 더한다 (빼기)", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addYears(-1);

      expect(newDateOnly.year).toBe(2024);
    });
  });

  describe("addMonths()", () => {
    it("양수 월을 더한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addMonths(3);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(4);
      expect(newDateOnly.day).toBe(6);
    });

    it("음수 월을 더한다 (빼기)", () => {
      const dateOnly = new DateOnly(2025, 3, 6);
      const newDateOnly = dateOnly.addMonths(-2);

      expect(newDateOnly.month).toBe(1);
    });

    it("연도를 넘어가는 경우를 처리한다", () => {
      const dateOnly = new DateOnly(2025, 11, 6);
      const newDateOnly = dateOnly.addMonths(3);

      expect(newDateOnly.year).toBe(2026);
      expect(newDateOnly.month).toBe(2);
    });
  });

  describe("addDays()", () => {
    it("양수 일을 더한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addDays(10);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(16);
    });

    it("음수 일을 더한다 (빼기)", () => {
      const dateOnly = new DateOnly(2025, 1, 16);
      const newDateOnly = dateOnly.addDays(-10);

      expect(newDateOnly.day).toBe(6);
    });

    it("월을 넘어가는 경우를 처리한다", () => {
      const dateOnly = new DateOnly(2025, 1, 31);
      const newDateOnly = dateOnly.addDays(1);

      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(1);
    });
  });

  //#endregion

  //#region 포맷팅

  describe("toFormatString()", () => {
    it("yyyy-MM-dd 형식으로 포맷팅한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyy-MM-dd")).toBe("2025-01-06");
    });

    it("yyyyMMdd 형식으로 포맷팅한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyyMMdd")).toBe("20250106");
    });

    it("yyyy년 M월 d일 형식으로 포맷팅한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyy년 M월 d일")).toBe("2025년 1월 6일");
    });

    it("요일을 포함한 형식으로 포맷팅한다", () => {
      // 2025-01-06은 월요일
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyy-MM-dd (ddd)")).toBe("2025-01-06 (월)");
    });
  });

  describe("toString()", () => {
    it("기본 형식 yyyy-MM-dd로 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toString()).toBe("2025-01-06");
    });
  });

  //#endregion
});
