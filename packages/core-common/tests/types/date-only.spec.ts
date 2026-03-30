import { describe, it, expect } from "vitest";
import { DateOnly } from "@simplysm/core-common";

describe("DateOnly", () => {
  //#region Constructor

  describe("constructor", () => {
    it("인수 없이 생성 시 오늘 날짜 반환", () => {
      const now = new Date();
      const dateOnly = new DateOnly();

      expect(dateOnly.year).toBe(now.getFullYear());
      expect(dateOnly.month).toBe(now.getMonth() + 1);
      expect(dateOnly.day).toBe(now.getDate());
    });

    it("년/월/일로 생성", () => {
      const dateOnly = new DateOnly(2025, 1, 6);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("tick(밀리초)으로 생성", () => {
      const tick = new Date(2025, 0, 6).getTime();
      const dateOnly = new DateOnly(tick);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("Date 타입으로 생성", () => {
      const date = new Date(2025, 0, 6, 15, 30, 45);
      const dateOnly = new DateOnly(date);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("Date 타입에서 생성 시 시간 무시", () => {
      const date1 = new Date(2025, 0, 6, 0, 0, 0);
      const date2 = new Date(2025, 0, 6, 23, 59, 59);

      const dateOnly1 = new DateOnly(date1);
      const dateOnly2 = new DateOnly(date2);

      expect(dateOnly1.tick).toBe(dateOnly2.tick);
    });

    it("윤년에 2월 29일 생성", () => {
      const dateOnly = new DateOnly(2024, 2, 29);

      expect(dateOnly.year).toBe(2024);
      expect(dateOnly.month).toBe(2);
      expect(dateOnly.day).toBe(29);
      expect(dateOnly.isValid).toBe(true);
    });

    it("비윤년에 2월 29일을 3월 1일로 조정 (JS Date 동작)", () => {
      const dateOnly = new DateOnly(2023, 2, 29);

      expect(dateOnly.year).toBe(2023);
      expect(dateOnly.month).toBe(3);
      expect(dateOnly.day).toBe(1);
    });

    it("잘못된 월(13)을 다음 해 1월로 조정 (JS Date 동작)", () => {
      const dateOnly = new DateOnly(2024, 13, 1);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(1);
    });
  });

  //#endregion

  //#region parse

  describe("parse()", () => {
    it("yyyy-MM-dd 형식 파싱", () => {
      const dateOnly = DateOnly.parse("2025-01-06");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("yyyyMMdd 형식 파싱", () => {
      const dateOnly = DateOnly.parse("20250106");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("ISO 8601 형식 파싱", () => {
      const dateOnly = DateOnly.parse("2025-01-06T00:00:00Z");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("잘못된 형식에 대해 오류 발생", () => {
      expect(() => DateOnly.parse("invalid-date")).toThrow("파싱 실패");
    });

    it("윤년 2월 29일 파싱", () => {
      const dateOnly = DateOnly.parse("2024-02-29");

      expect(dateOnly.year).toBe(2024);
      expect(dateOnly.month).toBe(2);
      expect(dateOnly.day).toBe(29);
    });
  });

  //#endregion

  //#region Getters

  describe("게터", () => {
    it("유효하지 않은 날짜는 isValid가 false", () => {
      const dateOnly = new DateOnly(NaN);
      expect(dateOnly.isValid).toBe(false);
    });
  });

  //#endregion

  //#region setX methods (immutable)

  describe("setYear()", () => {
    it("연도가 변경된 새 인스턴스 반환", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.setYear(2026);

      expect(newDateOnly.year).toBe(2026);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(6);
      expect(dateOnly.year).toBe(2025); // 원본 불변
    });

    it("윤년에서 비윤년으로 변경 시 2월 29일을 28일로 클램프", () => {
      const dateOnly = new DateOnly(2024, 2, 29); // 2024 is leap year
      const newDateOnly = dateOnly.setYear(2023); // 2023 is non-leap year

      expect(newDateOnly.year).toBe(2023);
      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(28); // Clamped to Feb 28
    });

    it("다른 윤년으로 변경 시 2월 29일 유지", () => {
      const dateOnly = new DateOnly(2024, 2, 29);
      const newDateOnly = dateOnly.setYear(2028);

      expect(newDateOnly.year).toBe(2028);
      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(29);
    });

    it("대상 월의 일수가 충분하면 일 유지", () => {
      const dateOnly = new DateOnly(2024, 1, 31);
      const newDateOnly = dateOnly.setYear(2025);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(31);
    });
  });

  describe("addYears()", () => {
    it("연도 추가 시 윤년 경계를 넘으면 2월 29일 클램프", () => {
      const dateOnly = new DateOnly(2024, 2, 29);
      const newDateOnly = dateOnly.addYears(1);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(28);
    });
  });

  describe("setMonth()", () => {
    it("월이 변경된 새 인스턴스 반환", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.setMonth(2);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(6);
      expect(dateOnly.month).toBe(1); // 원본 불변
    });

    it("대상 월의 일수가 적으면 해당 월 마지막 날로 조정", () => {
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

  //#endregion

  //#region addX methods (immutable)

  describe("addYears()", () => {
    it("양수 연도 더하기", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addYears(2);

      expect(newDateOnly.year).toBe(2027);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(6);
    });

    it("음수 연도 더하기 (빼기)", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addYears(-1);

      expect(newDateOnly.year).toBe(2024);
    });
  });

  describe("addMonths()", () => {
    it("양수 월 더하기", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addMonths(3);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(4);
      expect(newDateOnly.day).toBe(6);
    });

    it("음수 월 더하기 (빼기)", () => {
      const dateOnly = new DateOnly(2025, 3, 6);
      const newDateOnly = dateOnly.addMonths(-2);

      expect(newDateOnly.month).toBe(1);
    });

    it("월 추가 시 연도 경계 처리", () => {
      const dateOnly = new DateOnly(2025, 11, 6);
      const newDateOnly = dateOnly.addMonths(3);

      expect(newDateOnly.year).toBe(2026);
      expect(newDateOnly.month).toBe(2);
    });
  });

  describe("addDays()", () => {
    it("양수 일 더하기", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      const newDateOnly = dateOnly.addDays(10);

      expect(newDateOnly.year).toBe(2025);
      expect(newDateOnly.month).toBe(1);
      expect(newDateOnly.day).toBe(16);
    });

    it("음수 일 더하기 (빼기)", () => {
      const dateOnly = new DateOnly(2025, 1, 16);
      const newDateOnly = dateOnly.addDays(-10);

      expect(newDateOnly.day).toBe(6);
    });

    it("일 추가 시 월 경계 처리", () => {
      const dateOnly = new DateOnly(2025, 1, 31);
      const newDateOnly = dateOnly.addDays(1);

      expect(newDateOnly.month).toBe(2);
      expect(newDateOnly.day).toBe(1);
    });
  });

  //#endregion

  //#region Formatting

  describe("toFormatString()", () => {
    it("yyyy-MM-dd 형식으로 포맷", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyy-MM-dd")).toBe("2025-01-06");
    });

    it("yyyyMMdd 형식으로 포맷", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyyMMdd")).toBe("20250106");
    });

    it("한국어 날짜 형식 패턴으로 포맷 (yyyy년 M월 d일)", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyy년 M월 d일")).toBe("2025년 1월 6일");
    });

    it("요일과 함께 포맷", () => {
      // 2025-01-06 is Monday
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toFormatString("yyyy-MM-dd (ddd)")).toBe("2025-01-06 (월)");
    });
  });

  describe("toString()", () => {
    it("기본 형식 yyyy-MM-dd 반환", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.toString()).toBe("2025-01-06");
    });
  });

  //#endregion

  //#region Week calculation

  describe("getWeekSeqOfYear()", () => {
    describe("ISO 8601 표준 (월요일 시작, 첫 주 최소 4일)", () => {
      it("returns week sequence in middle of year", () => {
        // 2025-01-06 (Monday)
        const dateOnly = new DateOnly(2025, 1, 6);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(2);
      });

      it("handles year-start when within week 1 of current year", () => {
        // 2025-01-01 (Wednesday) - ISO 8601, January 2 (Thursday) is in same week, so 2025 week 1
        const dateOnly = new DateOnly(2025, 1, 1);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(1);
      });

      it("handles year-end when belonging to next year's week", () => {
        // 2024-12-30 (Monday) - Same week has 2025 January 2 (Thursday), so 2025 week 1
        const dateOnly = new DateOnly(2024, 12, 30);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(1);
      });
    });

    describe("미국식 (일요일 시작, 첫 주 최소 1일)", () => {
      it("year's first day belongs to week 1", () => {
        // 2025-01-01 (Wednesday)
        const dateOnly = new DateOnly(2025, 1, 1);
        const result = dateOnly.getWeekSeqOfYear(0, 1);

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(1);
      });

      it("returns week sequence in middle of year", () => {
        // 2025-01-12 (Sunday) - US style week 3 start
        const dateOnly = new DateOnly(2025, 1, 12);
        const result = dateOnly.getWeekSeqOfYear(0, 1);

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(3);
      });
    });

    describe("윤년 처리", () => {
      it("handles February 29 in leap year", () => {
        // 2024 is leap year, 2024-02-29 (Thursday)
        const dateOnly = new DateOnly(2024, 2, 29);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2024);
        expect(result.weekSeq).toBe(9);
      });
    });
  });

  describe("getWeekSeqOfMonth()", () => {
    describe("ISO 8601 표준 (월요일 시작, 첫 주 최소 4일)", () => {
      it("returns week sequence in middle of month", () => {
        // 2025-01-15 (Wednesday)
        const dateOnly = new DateOnly(2025, 1, 15);
        const result = dateOnly.getWeekSeqOfMonth();

        expect(result.year).toBe(2025);
        expect(result.monthSeq).toBe(1);
        expect(result.weekSeq).toBe(3);
      });

      it("handles month-start when belonging to previous month's week", () => {
        // 2025-02-01 (Saturday) - Belongs to January's last week
        const dateOnly = new DateOnly(2025, 2, 1);
        const result = dateOnly.getWeekSeqOfMonth();

        // February 1 is Saturday, doesn't meet 4-day minimum, so January week
        expect(result.monthSeq).toBe(1);
      });

      it("handles month-end when potentially belonging to next month's week", () => {
        // 2025-01-30 (Thursday) - Can belong to February week
        const dateOnly = new DateOnly(2025, 1, 30);
        const result = dateOnly.getWeekSeqOfMonth();

        expect(result.year).toBe(2025);
      });
    });

    describe("미국식 (일요일 시작, 첫 주 최소 1일)", () => {
      it("month's first day belongs to week 1", () => {
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
    it("returns current year-month for general date", () => {
      const dateOnly = new DateOnly(2025, 1, 15);
      const result = dateOnly.getBaseYearMonthSeqForWeekSeq();

      expect(result.year).toBe(2025);
      expect(result.monthSeq).toBe(1);
    });

    it("can return previous month at month boundary", () => {
      // May vary based on week start day
      const dateOnly = new DateOnly(2025, 2, 1);
      const result = dateOnly.getBaseYearMonthSeqForWeekSeq();

      // 2025-02-01 is Saturday, so may belong to January week
      expect(result.year).toBe(2025);
    });
  });

  describe("getWeekSeqStartDate()", () => {
    describe("ISO 8601 표준 (월요일 시작)", () => {
      it("returns week start date (Monday)", () => {
        // 2025-01-08 (Wednesday)
        const dateOnly = new DateOnly(2025, 1, 8);
        const result = dateOnly.getWeekSeqStartDate();

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(6); // Monday
        expect(result.dayOfWeek).toBe(1);
      });

      it("returns same date if already Monday", () => {
        // 2025-01-06 (Monday)
        const dateOnly = new DateOnly(2025, 1, 6);
        const result = dateOnly.getWeekSeqStartDate();

        expect(result.day).toBe(6);
      });
    });

    describe("미국식 (일요일 시작)", () => {
      it("returns week start date (Sunday)", () => {
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
    describe("ISO 8601 표준", () => {
      it("returns start date from year week sequence", () => {
        // 2025 week 2
        const result = DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 });

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(6); // 2025-01-06 (Monday)
      });

      it("returns start date from year-month week sequence", () => {
        // 2025 January week 3
        const result = DateOnly.getDateByYearWeekSeq({ year: 2025, month: 1, weekSeq: 3 });

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(13); // 2025-01-13 (Monday)
      });
    });

    describe("미국식", () => {
      it("returns start date from year week sequence", () => {
        // 2025 week 1 (US style)
        const result = DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 1 }, 0, 1);

        expect(result.year).toBe(2024);
        expect(result.month).toBe(12);
        expect(result.day).toBe(29); // 2024-12-29 (Sunday)
      });
    });

    describe("연도 경계 처리", () => {
      it("handles year with 53 weeks", () => {
        // 2020 has 53 weeks (ISO 8601)
        const result = DateOnly.getDateByYearWeekSeq({ year: 2020, weekSeq: 53 });

        expect(result.year).toBe(2020);
        expect(result.month).toBe(12);
        expect(result.day).toBe(28); // 2020-12-28 (Monday)
      });
    });

    describe("윤년 처리", () => {
      it("correctly calculates week for leap year", () => {
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
