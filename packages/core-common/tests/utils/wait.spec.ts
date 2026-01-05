import { describe, it, expect } from "vitest";
import { Wait, TimeoutError } from "@simplysm/core-common";

describe("Wait", () => {
  //#region time

  describe("time()", () => {
    it("지정된 시간만큼 대기한다", async () => {
      const start = Date.now();
      await Wait.time(100);
      const elapsed = Date.now() - start;

      // 100ms ± 오차 범위 (50ms)
      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(150);
    });

    it("0ms 대기도 정상 동작한다", async () => {
      const start = Date.now();
      await Wait.time(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  //#endregion

  //#region until

  describe("until()", () => {
    it("조건이 참이 될 때까지 대기한다", async () => {
      let count = 0;

      await Wait.until(() => {
        count++;
        return count >= 3;
      }, 10);

      expect(count).toBe(3);
    });

    it("비동기 조건 함수도 지원한다", async () => {
      let count = 0;

      await Wait.until(async () => {
        await Wait.time(10);
        count++;
        return count >= 3;
      }, 10);

      expect(count).toBe(3);
    });

    it("조건이 이미 참이면 즉시 반환한다", async () => {
      const start = Date.now();
      await Wait.until(() => true, 100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it("타임아웃이 발생하면 TimeoutError를 던진다", async () => {
      const start = Date.now();

      await expect(async () => {
        await Wait.until(() => false, 10, 50);
      }).rejects.toThrow(TimeoutError);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(elapsed).toBeLessThan(100);
    });

    it("타임아웃이 undefined면 무제한 대기한다", async () => {
      let count = 0;

      // 무제한 대기지만 조건이 참이 되면 반환
      await Wait.until(() => {
        count++;
        return count >= 5;
      }, 10, undefined);

      expect(count).toBe(5);
    });

    it("milliseconds 기본값은 100ms다", async () => {
      let count = 0;
      const start = Date.now();

      await Wait.until(() => {
        count++;
        return count >= 3;
      });

      const elapsed = Date.now() - start;
      // 100ms * 2회 체크 = 200ms (첫 체크는 즉시)
      expect(elapsed).toBeGreaterThanOrEqual(200);
      expect(elapsed).toBeLessThan(350);
    });
  });

  //#endregion
});
