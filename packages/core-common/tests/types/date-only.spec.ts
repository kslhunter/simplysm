import { describe, it, expect } from "vitest";
import { DateOnly } from "@simplysm/core-common";

describe("DateOnly", () => {
  //#region 생성자

  describe("생성자", () => {
    it("인수 없이 생성하면 오늘 날짜를 반환", () => {
      const now = new Date();
      const dateOnly = new DateOnly();

      expect(dateOnly.year).toBe(now.getFullYear());
      expect(dateOnly.month).toBe(now.getMonth() + 1);
      expect(dateOnly.day).toBe(now.getDate());
    });

    it("year/month/day로 생성", () => {
      const dateOnly = new DateOnly(2025, 1, 6);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(6);
    });

    it("tick (millisecond)으로 생성한다", () => {
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

    it("Date 타입에서 생성할 때 시간을 무시한다", () => {
      const date1 = new Date(2025, 0, 6, 0, 0, 0);
      const date2 = new Date(2025, 0, 6, 23, 59, 59);

      const dateOnly1 = new DateOnly(date1);
      const dateOnly2 = new DateOnly(date2);

      expect(dateOnly1.tick).toBe(dateOnly2.tick);
    });

    it("윤년 2월 29일을 생성한다", () => {
      const dateOnly = new DateOnly(2024, 2, 29);

      expect(dateOnly.year).toBe(2024);
      expect(dateOnly.month).toBe(2);
      expect(dateOnly.day).toBe(29);
      expect(dateOnly.isValid).toBe(true);
    });

    it("평년 2월 29일은 3월 1일로 조정된다 (JS Date 동작)", () => {
      const dateOnly = new DateOnly(2023, 2, 29);

      expect(dateOnly.year).toBe(2023);
      expect(dateOnly.month).toBe(3);
      expect(dateOnly.day).toBe(1);
    });

    it("유효하지 않은 월(13)은 다음 해 1월로 조정된다 (JS Date 동작)", () => {
      const dateOnly = new DateOnly(2024, 13, 1);

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(1);
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

    it("연말 경계(12월 31일)를 파싱한다", () => {
      const dateOnly = DateOnly.parse("2024-12-31");

      expect(dateOnly.year).toBe(2024);
      expect(dateOnly.month).toBe(12);
      expect(dateOnly.day).toBe(31);
    });

    it("연초 경계(1월 1일)를 파싱한다", () => {
      const dateOnly = DateOnly.parse("2025-01-01");

      expect(dateOnly.year).toBe(2025);
      expect(dateOnly.month).toBe(1);
      expect(dateOnly.day).toBe(1);
    });

    it("윤년 2월 29일을 파싱한다", () => {
      const dateOnly = DateOnly.parse("2024-02-29");

      expect(dateOnly.year).toBe(2024);
      expect(dateOnly.month).toBe(2);
      expect(dateOnly.day).toBe(29);
    });

    it("윤년 2월 28일을 파싱한다", () => {
      const dateOnly = DateOnly.parse("2024-02-28");

      expect(dateOnly.year).toBe(2024);
      expect(dateOnly.month).toBe(2);
      expect(dateOnly.day).toBe(28);
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

    it("dayOfWeek를 반환한다 (일~토: 0~6)", () => {
      // 2025-01-06은 월요일 (1)
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.dayOfWeek).toBe(1);
    });

    it("isValid를 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(dateOnly.isValid).toBe(true);
    });

    it("유효하지 않은 날짜는 isValid가 false를 반환한다", () => {
      const dateOnly = new DateOnly(NaN);
      expect(dateOnly.isValid).toBe(false);
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

    it("윤년 2월 29일에서 평년으로 setYear하면 3월 1일로 조정된다", () => {
      const dateOnly = new DateOnly(2024, 2, 29); // 2024년은 윤년
      const newDateOnly = dateOnly.setYear(2023); // 2023년은 평년

      expect(newDateOnly.year).toBe(2023);
      expect(newDateOnly.month).toBe(3);
      expect(newDateOnly.day).toBe(1); // 2월 29일 → 3월 1일로 조정
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

  //#region tick 비교

  describe("tick 비교", () => {
    it("같은 날짜는 같은 tick을 가진다", () => {
      const d1 = new DateOnly(2025, 3, 15);
      const d2 = new DateOnly(2025, 3, 15);

      expect(d1.tick).toBe(d2.tick);
    });

    it("다른 날짜는 다른 tick을 가진다", () => {
      const d1 = new DateOnly(2025, 3, 15);
      const d2 = new DateOnly(2025, 3, 16);

      expect(d1.tick).not.toBe(d2.tick);
    });

    it("tick으로 날짜 순서를 비교할 수 있다", () => {
      const d1 = new DateOnly(2025, 1, 1);
      const d2 = new DateOnly(2025, 6, 15);
      const d3 = new DateOnly(2025, 12, 31);

      expect(d1.tick).toBeLessThan(d2.tick);
      expect(d2.tick).toBeLessThan(d3.tick);
    });

    it("연도가 다른 날짜도 tick으로 비교할 수 있다", () => {
      const d2024 = new DateOnly(2024, 12, 31);
      const d2025 = new DateOnly(2025, 1, 1);

      expect(d2024.tick).toBeLessThan(d2025.tick);
    });
  });

  //#endregion

  //#region 주차 계산

  describe("getWeekSeqOfYear()", () => {
    describe("ISO 8601 표준 (월요일 시작, 첫 주 최소 4일)", () => {
      it("연도 중간의 주차를 반환한다", () => {
        // 2025-01-06 (월요일)
        const dateOnly = new DateOnly(2025, 1, 6);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(2);
      });

      it("연초가 이번 연도 1주차에 속하는 경우를 처리한다", () => {
        // 2025-01-01 (수요일) - ISO 8601에서 1월 2일(목)이 같은 주에 있으므로 2025년 1주차
        const dateOnly = new DateOnly(2025, 1, 1);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(1);
      });

      it("연말이 다음 연도 주차에 속하는 경우를 처리한다", () => {
        // 2024-12-30 (월요일) - 같은 주에 2025년 1월 2일(목)이 있으므로 2025년 1주차
        const dateOnly = new DateOnly(2024, 12, 30);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(1);
      });
    });

    describe("미국식 (일요일 시작, 첫 주 최소 1일)", () => {
      it("연도 첫 날이 첫 주차에 속한다", () => {
        // 2025-01-01 (수요일)
        const dateOnly = new DateOnly(2025, 1, 1);
        const result = dateOnly.getWeekSeqOfYear(0, 1);

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(1);
      });

      it("연도 중간의 주차를 반환한다", () => {
        // 2025-01-12 (일요일) - 미국식 3주차 시작
        const dateOnly = new DateOnly(2025, 1, 12);
        const result = dateOnly.getWeekSeqOfYear(0, 1);

        expect(result.year).toBe(2025);
        expect(result.weekSeq).toBe(3);
      });
    });

    describe("윤년 처리", () => {
      it("윤년의 2월 29일을 처리한다", () => {
        // 2024년은 윤년, 2024-02-29 (목요일)
        const dateOnly = new DateOnly(2024, 2, 29);
        const result = dateOnly.getWeekSeqOfYear();

        expect(result.year).toBe(2024);
        expect(result.weekSeq).toBe(9);
      });
    });
  });

  describe("getWeekSeqOfMonth()", () => {
    describe("ISO 8601 표준 (월요일 시작, 첫 주 최소 4일)", () => {
      it("월 중간의 주차를 반환한다", () => {
        // 2025-01-15 (수요일)
        const dateOnly = new DateOnly(2025, 1, 15);
        const result = dateOnly.getWeekSeqOfMonth();

        expect(result.year).toBe(2025);
        expect(result.monthSeq).toBe(1);
        expect(result.weekSeq).toBe(3);
      });

      it("월초가 이전 달 주차에 속하는 경우를 처리한다", () => {
        // 2025-02-01 (토요일) - 1월의 마지막 주에 속함
        const dateOnly = new DateOnly(2025, 2, 1);
        const result = dateOnly.getWeekSeqOfMonth();

        // 2월 1일이 토요일이고 첫 주 최소 4일 조건을 충족하지 못하면 1월 주차
        expect(result.monthSeq).toBe(1);
      });

      it("월말이 다음 달 주차에 속하는 경우를 처리한다", () => {
        // 2025-01-30 (목요일) - 2월 1주차에 속할 수 있음
        const dateOnly = new DateOnly(2025, 1, 30);
        const result = dateOnly.getWeekSeqOfMonth();

        expect(result.year).toBe(2025);
      });
    });

    describe("미국식 (일요일 시작, 첫 주 최소 1일)", () => {
      it("월 첫 날이 첫 주차에 속한다", () => {
        // 2025-01-01 (수요일)
        const dateOnly = new DateOnly(2025, 1, 1);
        const result = dateOnly.getWeekSeqOfMonth(0, 1);

        expect(result.year).toBe(2025);
        expect(result.monthSeq).toBe(1);
        expect(result.weekSeq).toBe(1);
      });
    });
  });

  describe("getBaseYearMonthSeqForWeekSeq()", () => {
    it("일반적인 날짜에서 현재 연월을 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 15);
      const result = dateOnly.getBaseYearMonthSeqForWeekSeq();

      expect(result.year).toBe(2025);
      expect(result.monthSeq).toBe(1);
    });

    it("월 경계에서 이전 달을 반환할 수 있다", () => {
      // 주 시작 요일에 따라 이전/다음 달로 분류될 수 있음
      const dateOnly = new DateOnly(2025, 2, 1);
      const result = dateOnly.getBaseYearMonthSeqForWeekSeq();

      // 2025-02-01이 토요일이면 이전 달(1월) 주차에 속함
      expect(result.year).toBe(2025);
    });
  });

  describe("getWeekSeqStartDate()", () => {
    describe("ISO 8601 표준 (월요일 시작)", () => {
      it("주의 시작 날짜(월요일)를 반환한다", () => {
        // 2025-01-08 (수요일)
        const dateOnly = new DateOnly(2025, 1, 8);
        const result = dateOnly.getWeekSeqStartDate();

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(6); // 월요일
        expect(result.dayOfWeek).toBe(1);
      });

      it("이미 월요일이면 같은 날짜를 반환한다", () => {
        // 2025-01-06 (월요일)
        const dateOnly = new DateOnly(2025, 1, 6);
        const result = dateOnly.getWeekSeqStartDate();

        expect(result.day).toBe(6);
      });
    });

    describe("미국식 (일요일 시작)", () => {
      it("주의 시작 날짜(일요일)를 반환한다", () => {
        // 2025-01-08 (수요일)
        const dateOnly = new DateOnly(2025, 1, 8);
        const result = dateOnly.getWeekSeqStartDate(0, 1);

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(5); // 일요일
        expect(result.dayOfWeek).toBe(0);
      });
    });
  });

  describe("getDateByYearWeekSeq()", () => {
    describe("ISO 8601 표준", () => {
      it("연간 주차로부터 시작일을 반환한다", () => {
        // 2025년 2주차
        const result = DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 });

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(6); // 2025-01-06 (월요일)
      });

      it("월간 주차로부터 시작일을 반환한다", () => {
        // 2025년 1월 3주차
        const result = DateOnly.getDateByYearWeekSeq({ year: 2025, month: 1, weekSeq: 3 });

        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(13); // 2025-01-13 (월요일)
      });
    });

    describe("미국식", () => {
      it("연간 주차로부터 시작일을 반환한다", () => {
        // 2025년 1주차 (미국식)
        const result = DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 1 }, 0, 1);

        expect(result.year).toBe(2024);
        expect(result.month).toBe(12);
        expect(result.day).toBe(29); // 2024-12-29 (일요일)
      });
    });

    describe("연도 경계 처리", () => {
      it("53주차가 있는 연도를 처리한다", () => {
        // 2020년은 53주까지 있음 (ISO 8601)
        const result = DateOnly.getDateByYearWeekSeq({ year: 2020, weekSeq: 53 });

        expect(result.year).toBe(2020);
        expect(result.month).toBe(12);
        expect(result.day).toBe(28); // 2020-12-28 (월요일)
      });
    });

    describe("윤년 처리", () => {
      it("윤년의 주차를 올바르게 계산한다", () => {
        // 2024년 (윤년) 10주차
        const result = DateOnly.getDateByYearWeekSeq({ year: 2024, weekSeq: 10 });

        expect(result.year).toBe(2024);
        expect(result.month).toBe(3);
        expect(result.day).toBe(4); // 2024-03-04 (월요일)
      });
    });
  });

  //#endregion
});
