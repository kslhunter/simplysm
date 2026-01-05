import { describe, it, expect } from "vitest";
import { Time } from "@simplysm/core-common";

describe("Time", () => {
  //#region 생성자

  describe("constructor", () => {
    it("인수 없이 생성하면 현재 시간을 반환한다", () => {
      const now = new Date();
      const time = new Time();

      // 시간은 실시간으로 변하므로 범위 테스트
      expect(time.hour).toBeGreaterThanOrEqual(0);
      expect(time.hour).toBeLessThanOrEqual(23);
      expect(time.minute).toBeGreaterThanOrEqual(0);
      expect(time.minute).toBeLessThanOrEqual(59);
    });

    it("시분초로 생성한다", () => {
      const time = new Time(15, 30, 45);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(0);
    });

    it("시분초 밀리초로 생성한다", () => {
      const time = new Time(15, 30, 45, 123);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("tick (millisecond)로 생성한다", () => {
      // 15:30:45.123 = (15*60*60 + 30*60 + 45)*1000 + 123
      const tick = (15 * 60 * 60 + 30 * 60 + 45) * 1000 + 123;
      const time = new Time(tick);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("Date 타입으로 생성한다", () => {
      const date = new Date(2025, 0, 6, 15, 30, 45, 123);
      const time = new Time(date);

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("24시간을 넘으면 나머지만 저장한다", () => {
      // 25시간 = 1시간
      const time = new Time(25, 0, 0);

      expect(time.hour).toBe(1);
    });
  });

  //#endregion

  //#region parse

  describe("parse()", () => {
    it("HH:mm:ss 형식을 파싱한다", () => {
      const time = Time.parse("15:30:45");

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(0);
    });

    it("HH:mm:ss.fff 형식을 파싱한다", () => {
      const time = Time.parse("15:30:45.123");

      expect(time.hour).toBe(15);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
      expect(time.millisecond).toBe(123);
    });

    it("오전 HH:mm:ss 형식을 파싱한다", () => {
      const time = Time.parse("오전 9:30:45");

      expect(time.hour).toBe(9);
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("오후 HH:mm:ss 형식을 파싱한다", () => {
      const time = Time.parse("오후 3:30:45");

      expect(time.hour).toBe(15); // 12 + 3
      expect(time.minute).toBe(30);
      expect(time.second).toBe(45);
    });

    it("밀리초 자릿수가 부족하면 0으로 패딩한다", () => {
      const time = Time.parse("15:30:45.1");

      expect(time.millisecond).toBe(100); // '1' → '100'
    });

    it("잘못된 형식이면 에러를 던진다", () => {
      expect(() => Time.parse("invalid-time")).toThrow("시간 형식을 파싱할 수 없습니다");
    });
  });

  //#endregion

  //#region Getters

  describe("Getters", () => {
    it("hour를 반환한다", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.hour).toBe(15);
    });

    it("minute를 반환한다", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.minute).toBe(30);
    });

    it("second를 반환한다", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.second).toBe(45);
    });

    it("millisecond를 반환한다", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.millisecond).toBe(123);
    });

    it("tick을 반환한다", () => {
      const time = new Time(15, 30, 45, 123);
      const expectedTick = (15 * 60 * 60 + 30 * 60 + 45) * 1000 + 123;
      expect(time.tick).toBe(expectedTick);
    });
  });

  //#endregion

  //#region setX 메서드 (불변)

  describe("setHour()", () => {
    it("시를 변경한 새 인스턴스를 반환한다", () => {
      const time = new Time(15, 30, 45, 123);
      const newTime = time.setHour(20);

      expect(newTime.hour).toBe(20);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(45);
      expect(newTime.millisecond).toBe(123);
      expect(time.hour).toBe(15); // 원본 불변
    });
  });

  describe("setMinute()", () => {
    it("분을 변경한 새 인스턴스를 반환한다", () => {
      const time = new Time(15, 30, 45, 123);
      const newTime = time.setMinute(50);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(50);
      expect(newTime.second).toBe(45);
      expect(newTime.millisecond).toBe(123);
      expect(time.minute).toBe(30); // 원본 불변
    });
  });

  describe("setSecond()", () => {
    it("초를 변경한 새 인스턴스를 반환한다", () => {
      const time = new Time(15, 30, 45, 123);
      const newTime = time.setSecond(55);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(55);
      expect(newTime.millisecond).toBe(123);
      expect(time.second).toBe(45); // 원본 불변
    });
  });

  describe("setMillisecond()", () => {
    it("밀리초를 변경한 새 인스턴스를 반환한다", () => {
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

  //#region addX 메서드 (불변)

  describe("addHours()", () => {
    it("양수 시를 더한다", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addHours(3);

      expect(newTime.hour).toBe(18);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(45);
    });

    it("음수 시를 더한다 (빼기)", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addHours(-5);

      expect(newTime.hour).toBe(10);
    });

    it("24시간을 넘어가면 나머지만 저장한다", () => {
      const time = new Time(22, 0, 0);
      const newTime = time.addHours(5);

      expect(newTime.hour).toBe(3); // (22 + 5) % 24
    });
  });

  describe("addMinutes()", () => {
    it("양수 분을 더한다", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addMinutes(20);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(50);
    });

    it("음수 분을 더한다 (빼기)", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addMinutes(-20);

      expect(newTime.minute).toBe(10);
    });

    it("60분을 넘어가면 시간이 증가한다", () => {
      const time = new Time(15, 50, 0);
      const newTime = time.addMinutes(20);

      expect(newTime.hour).toBe(16);
      expect(newTime.minute).toBe(10);
    });
  });

  describe("addSeconds()", () => {
    it("양수 초를 더한다", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addSeconds(10);

      expect(newTime.hour).toBe(15);
      expect(newTime.minute).toBe(30);
      expect(newTime.second).toBe(55);
    });

    it("음수 초를 더한다 (빼기)", () => {
      const time = new Time(15, 30, 45);
      const newTime = time.addSeconds(-10);

      expect(newTime.second).toBe(35);
    });

    it("60초를 넘어가면 분이 증가한다", () => {
      const time = new Time(15, 30, 50);
      const newTime = time.addSeconds(20);

      expect(newTime.minute).toBe(31);
      expect(newTime.second).toBe(10);
    });
  });

  describe("addMilliseconds()", () => {
    it("양수 밀리초를 더한다", () => {
      const time = new Time(15, 30, 45, 100);
      const newTime = time.addMilliseconds(50);

      expect(newTime.millisecond).toBe(150);
    });

    it("음수 밀리초를 더한다 (빼기)", () => {
      const time = new Time(15, 30, 45, 100);
      const newTime = time.addMilliseconds(-50);

      expect(newTime.millisecond).toBe(50);
    });

    it("1000밀리초를 넘어가면 초가 증가한다", () => {
      const time = new Time(15, 30, 45, 900);
      const newTime = time.addMilliseconds(200);

      expect(newTime.second).toBe(46);
      expect(newTime.millisecond).toBe(100);
    });
  });

  //#endregion

  //#region 포맷팅

  describe("toFormatString()", () => {
    it("HH:mm:ss 형식으로 포맷팅한다", () => {
      const time = new Time(15, 30, 45);
      expect(time.toFormatString("HH:mm:ss")).toBe("15:30:45");
    });

    it("HH:mm:ss.fff 형식으로 포맷팅한다", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.toFormatString("HH:mm:ss.fff")).toBe("15:30:45.123");
    });

    it("tt hh:mm:ss 형식으로 포맷팅한다 (오전)", () => {
      const time = new Time(9, 30, 45);
      expect(time.toFormatString("tt hh:mm:ss")).toBe("오전 09:30:45");
    });

    it("tt hh:mm:ss 형식으로 포맷팅한다 (오후)", () => {
      const time = new Time(15, 30, 45);
      expect(time.toFormatString("tt hh:mm:ss")).toBe("오후 03:30:45");
    });

    it("H:m:s 형식으로 포맷팅한다 (패딩 없음)", () => {
      const time = new Time(9, 5, 3);
      expect(time.toFormatString("H:m:s")).toBe("9:5:3");
    });
  });

  describe("toString()", () => {
    it("기본 형식 HH:mm:ss.fff로 반환한다", () => {
      const time = new Time(15, 30, 45, 123);
      expect(time.toString()).toBe("15:30:45.123");
    });
  });

  //#endregion
});
