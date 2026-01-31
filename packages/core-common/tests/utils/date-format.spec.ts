import { describe, it, expect } from "vitest";
import { format, normalizeMonth } from "@simplysm/core-common";

describe("formatDateTime", () => {
  //#region 연도 패턴

  describe("연도 패턴", () => {
    it("yyyy - 4자리 연도를 출력한다", () => {
      expect(format("yyyy", { year: 2025 })).toBe("2025");
    });

    it("yy - 2자리 연도를 출력한다", () => {
      expect(format("yy", { year: 2025 })).toBe("25");
      expect(format("yy", { year: 2000 })).toBe("00");
      expect(format("yy", { year: 1999 })).toBe("99");
    });
  });

  //#endregion

  //#region 월 패턴

  describe("월 패턴", () => {
    it("MM - 2자리 월을 출력한다", () => {
      expect(format("MM", { month: 1 })).toBe("01");
      expect(format("MM", { month: 9 })).toBe("09");
      expect(format("MM", { month: 12 })).toBe("12");
    });

    it("M - 패딩 없이 월을 출력한다", () => {
      expect(format("M", { month: 1 })).toBe("1");
      expect(format("M", { month: 9 })).toBe("9");
      expect(format("M", { month: 12 })).toBe("12");
    });
  });

  //#endregion

  //#region 일 패턴

  describe("일 패턴", () => {
    it("dd - 2자리 일을 출력한다", () => {
      expect(format("dd", { day: 1 })).toBe("01");
      expect(format("dd", { day: 9 })).toBe("09");
      expect(format("dd", { day: 31 })).toBe("31");
    });

    it("d - 패딩 없이 일을 출력한다", () => {
      expect(format("d", { day: 1 })).toBe("1");
      expect(format("d", { day: 9 })).toBe("9");
      expect(format("d", { day: 31 })).toBe("31");
    });
  });

  //#endregion

  //#region 요일 패턴

  describe("요일 패턴", () => {
    it("ddd - 요일을 한글로 출력한다", () => {
      // 2025-01-18은 토요일
      expect(format("ddd", { year: 2025, month: 1, day: 18 })).toBe("토");
      // 2025-01-19는 일요일
      expect(format("ddd", { year: 2025, month: 1, day: 19 })).toBe("일");
      // 2025-01-20은 월요일
      expect(format("ddd", { year: 2025, month: 1, day: 20 })).toBe("월");
    });
  });

  //#endregion

  //#region 시간 패턴

  describe("시간 패턴", () => {
    it("hh - 12시간 형식으로 패딩하여 출력한다", () => {
      expect(format("hh", { hour: 0 })).toBe("12");
      expect(format("hh", { hour: 1 })).toBe("01");
      expect(format("hh", { hour: 12 })).toBe("12");
      expect(format("hh", { hour: 13 })).toBe("01");
    });

    it("h - 12시간 형식으로 패딩 없이 출력한다", () => {
      expect(format("h", { hour: 0 })).toBe("12");
      expect(format("h", { hour: 1 })).toBe("1");
      expect(format("h", { hour: 9 })).toBe("9");
      expect(format("h", { hour: 10 })).toBe("10");
      expect(format("h", { hour: 12 })).toBe("12");
      expect(format("h", { hour: 13 })).toBe("1");
      expect(format("h", { hour: 23 })).toBe("11");
    });

    it("HH - 24시간 형식으로 패딩하여 출력한다", () => {
      expect(format("HH", { hour: 0 })).toBe("00");
      expect(format("HH", { hour: 9 })).toBe("09");
      expect(format("HH", { hour: 23 })).toBe("23");
    });

    it("H - 24시간 형식으로 패딩 없이 출력한다", () => {
      expect(format("H", { hour: 0 })).toBe("0");
      expect(format("H", { hour: 9 })).toBe("9");
      expect(format("H", { hour: 23 })).toBe("23");
    });

    it("tt - 오전/오후를 출력한다", () => {
      expect(format("tt", { hour: 0 })).toBe("오전");
      expect(format("tt", { hour: 11 })).toBe("오전");
      expect(format("tt", { hour: 12 })).toBe("오후");
      expect(format("tt", { hour: 23 })).toBe("오후");
    });
  });

  //#endregion

  //#region 분 패턴

  describe("분 패턴", () => {
    it("mm - 2자리 분을 출력한다", () => {
      expect(format("mm", { minute: 0 })).toBe("00");
      expect(format("mm", { minute: 5 })).toBe("05");
      expect(format("mm", { minute: 59 })).toBe("59");
    });

    it("m - 패딩 없이 분을 출력한다", () => {
      expect(format("m", { minute: 0 })).toBe("0");
      expect(format("m", { minute: 5 })).toBe("5");
      expect(format("m", { minute: 59 })).toBe("59");
    });
  });

  //#endregion

  //#region 초 패턴

  describe("초 패턴", () => {
    it("ss - 2자리 초를 출력한다", () => {
      expect(format("ss", { second: 0 })).toBe("00");
      expect(format("ss", { second: 5 })).toBe("05");
      expect(format("ss", { second: 59 })).toBe("59");
    });

    it("s - 패딩 없이 초를 출력한다", () => {
      expect(format("s", { second: 0 })).toBe("0");
      expect(format("s", { second: 5 })).toBe("5");
      expect(format("s", { second: 59 })).toBe("59");
    });
  });

  //#endregion

  //#region 밀리초 패턴

  describe("밀리초 패턴", () => {
    it("fff - 3자리 밀리초를 출력한다", () => {
      expect(format("fff", { millisecond: 0 })).toBe("000");
      expect(format("fff", { millisecond: 5 })).toBe("005");
      expect(format("fff", { millisecond: 50 })).toBe("050");
      expect(format("fff", { millisecond: 500 })).toBe("500");
      expect(format("fff", { millisecond: 999 })).toBe("999");
    });

    it("ff - 2자리 밀리초를 출력한다", () => {
      expect(format("ff", { millisecond: 0 })).toBe("00");
      expect(format("ff", { millisecond: 5 })).toBe("00");
      expect(format("ff", { millisecond: 50 })).toBe("05");
      expect(format("ff", { millisecond: 500 })).toBe("50");
      expect(format("ff", { millisecond: 999 })).toBe("99");
    });

    it("f - 1자리 밀리초를 출력한다", () => {
      expect(format("f", { millisecond: 0 })).toBe("0");
      expect(format("f", { millisecond: 5 })).toBe("0");
      expect(format("f", { millisecond: 100 })).toBe("1");
      expect(format("f", { millisecond: 500 })).toBe("5");
      expect(format("f", { millisecond: 999 })).toBe("9");
    });
  });

  //#endregion

  //#region 타임존 패턴

  describe("타임존 패턴", () => {
    describe("양수 오프셋 (동쪽)", () => {
      it("zzz - +HH:mm 형식으로 출력한다", () => {
        // UTC+9 (540분)
        expect(format("zzz", { timezoneOffsetMinutes: 540 })).toBe("+09:00");
        // UTC+5:30 (330분)
        expect(format("zzz", { timezoneOffsetMinutes: 330 })).toBe("+05:30");
      });

      it("zz - +HH 형식으로 출력한다", () => {
        expect(format("zz", { timezoneOffsetMinutes: 540 })).toBe("+09");
        expect(format("zz", { timezoneOffsetMinutes: 60 })).toBe("+01");
      });

      it("z - +H 형식으로 출력한다 (패딩 없음)", () => {
        expect(format("z", { timezoneOffsetMinutes: 540 })).toBe("+9");
        expect(format("z", { timezoneOffsetMinutes: 60 })).toBe("+1");
        expect(format("z", { timezoneOffsetMinutes: 600 })).toBe("+10");
      });
    });

    describe("음수 오프셋 (서쪽)", () => {
      it("zzz - -HH:mm 형식으로 출력한다", () => {
        // UTC-5 (-300분) - 정수 시간대
        expect(format("zzz", { timezoneOffsetMinutes: -300 })).toBe("-05:00");
        // UTC-8 (-480분) - 정수 시간대
        expect(format("zzz", { timezoneOffsetMinutes: -480 })).toBe("-08:00");
        // UTC-3:30 (-210분) - Newfoundland Standard Time
        expect(format("zzz", { timezoneOffsetMinutes: -210 })).toBe("-03:30");
        // UTC-9:30 (-570분) - Marquesas Islands
        expect(format("zzz", { timezoneOffsetMinutes: -570 })).toBe("-09:30");
      });

      it("zz - -HH 형식으로 출력한다", () => {
        expect(format("zz", { timezoneOffsetMinutes: -300 })).toBe("-05");
        expect(format("zz", { timezoneOffsetMinutes: -60 })).toBe("-01");
      });

      it("z - -H 형식으로 출력한다 (패딩 없음)", () => {
        expect(format("z", { timezoneOffsetMinutes: -300 })).toBe("-5");
        expect(format("z", { timezoneOffsetMinutes: -60 })).toBe("-1");
        expect(format("z", { timezoneOffsetMinutes: -720 })).toBe("-12");
      });
    });

    describe("UTC (0 오프셋)", () => {
      it("zzz - +00:00으로 출력한다", () => {
        expect(format("zzz", { timezoneOffsetMinutes: 0 })).toBe("+00:00");
      });

      it("zz - +00으로 출력한다", () => {
        expect(format("zz", { timezoneOffsetMinutes: 0 })).toBe("+00");
      });

      it("z - +0으로 출력한다", () => {
        expect(format("z", { timezoneOffsetMinutes: 0 })).toBe("+0");
      });
    });
  });

  //#endregion

  //#region 복합 포맷

  describe("복합 포맷", () => {
    it("전체 날짜/시간 포맷을 처리한다", () => {
      const result = format("yyyy-MM-dd HH:mm:ss.fff", {
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

    it("12시간 형식 포맷을 처리한다", () => {
      const result = format("yyyy-MM-dd tt h:mm:ss", {
        year: 2025,
        month: 1,
        day: 18,
        hour: 14,
        minute: 5,
        second: 9,
      });
      expect(result).toBe("2025-01-18 오후 2:05:09");
    });

    it("타임존 포함 포맷을 처리한다", () => {
      const result = format("yyyy-MM-ddTHH:mm:sszzz", {
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
  //#region 정상 범위

  describe("정상 범위 (1-12)", () => {
    it("월이 1-12 범위 내면 그대로 반환한다", () => {
      expect(normalizeMonth(2025, 1, 15)).toEqual({ year: 2025, month: 1, day: 15 });
      expect(normalizeMonth(2025, 6, 15)).toEqual({ year: 2025, month: 6, day: 15 });
      expect(normalizeMonth(2025, 12, 15)).toEqual({ year: 2025, month: 12, day: 15 });
    });
  });

  //#endregion

  //#region 월 오버플로우

  describe("월 오버플로우 (13 이상)", () => {
    it("13월은 다음 해 1월이 된다", () => {
      expect(normalizeMonth(2025, 13, 15)).toEqual({ year: 2026, month: 1, day: 15 });
    });

    it("14월은 다음 해 2월이 된다", () => {
      expect(normalizeMonth(2025, 14, 15)).toEqual({ year: 2026, month: 2, day: 15 });
    });

    it("25월은 2년 후 1월이 된다", () => {
      expect(normalizeMonth(2025, 25, 15)).toEqual({ year: 2027, month: 1, day: 15 });
    });

    it("24월은 다음 해 12월이 된다", () => {
      expect(normalizeMonth(2025, 24, 15)).toEqual({ year: 2026, month: 12, day: 15 });
    });
  });

  //#endregion

  //#region 월 언더플로우

  describe("월 언더플로우 (0 이하)", () => {
    it("0월은 이전 해 12월이 된다", () => {
      expect(normalizeMonth(2025, 0, 15)).toEqual({ year: 2024, month: 12, day: 15 });
    });

    it("-1월은 이전 해 11월이 된다", () => {
      expect(normalizeMonth(2025, -1, 15)).toEqual({ year: 2024, month: 11, day: 15 });
    });

    it("-11월은 이전 해 1월이 된다", () => {
      expect(normalizeMonth(2025, -11, 15)).toEqual({ year: 2024, month: 1, day: 15 });
    });

    it("-12월은 2년 전 12월이 된다", () => {
      expect(normalizeMonth(2025, -12, 15)).toEqual({ year: 2023, month: 12, day: 15 });
    });

    it("-13월은 2년 전 11월이 된다", () => {
      expect(normalizeMonth(2025, -13, 15)).toEqual({ year: 2023, month: 11, day: 15 });
    });
  });

  //#endregion

  //#region 일 조정

  describe("일 조정 (대상 월의 마지막 날)", () => {
    it("31일에서 2월로 변경하면 28일로 조정된다 (평년)", () => {
      expect(normalizeMonth(2025, 2, 31)).toEqual({ year: 2025, month: 2, day: 28 });
    });

    it("31일에서 2월로 변경하면 29일로 조정된다 (윤년)", () => {
      expect(normalizeMonth(2024, 2, 31)).toEqual({ year: 2024, month: 2, day: 29 });
    });

    it("31일에서 4월로 변경하면 30일로 조정된다", () => {
      expect(normalizeMonth(2025, 4, 31)).toEqual({ year: 2025, month: 4, day: 30 });
    });

    it("대상 월의 일수보다 작으면 그대로 유지된다", () => {
      expect(normalizeMonth(2025, 3, 15)).toEqual({ year: 2025, month: 3, day: 15 });
    });
  });

  //#endregion
});
