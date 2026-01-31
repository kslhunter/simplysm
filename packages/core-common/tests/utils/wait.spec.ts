import { describe, it, expect } from "vitest";
import { waitTime as time, waitUntil as until, TimeoutError } from "@simplysm/core-common";

describe("Wait", () => {
  //#region time

  describe("time()", () => {
    it("지정된 시간만큼 대기한다", async () => {
      const start = Date.now();
      await time(100);
      const elapsed = Date.now() - start;

      // 100ms ± 오차 범위 - CI 환경 부하 및 타이머 정밀도 고려
      expect(elapsed).toBeGreaterThanOrEqual(95);
      expect(elapsed).toBeLessThan(250);
    });

    it("0ms 대기도 정상 동작한다", async () => {
      const start = Date.now();
      await time(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  //#endregion

  //#region until

  describe("until()", () => {
    it("조건이 참이 될 때까지 대기한다", async () => {
      let count = 0;

      await until(() => {
        count++;
        return count >= 3;
      }, 10);

      expect(count).toBe(3);
    });

    it("비동기 조건 함수도 지원한다", async () => {
      let count = 0;

      await until(async () => {
        await time(10);
        count++;
        return count >= 3;
      }, 10);

      expect(count).toBe(3);
    });

    it("조건이 이미 참이면 즉시 반환한다", async () => {
      const start = Date.now();
      await until(() => true, 100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it("최대 시도 횟수 초과 시 TimeoutError를 던진다", async () => {
      let count = 0;

      await expect(async () => {
        await until(() => {
          count++;
          return false;
        }, 10, 5);
      }).rejects.toThrow(TimeoutError);

      expect(count).toBe(5);
    });

    it("maxCount가 undefined면 무제한 대기한다", async () => {
      let count = 0;

      // 무제한 대기지만 조건이 참이 되면 반환
      await until(() => {
        count++;
        return count >= 10;
      }, 10, undefined);

      expect(count).toBe(10);
    });

    it("milliseconds 기본값은 100ms다", async () => {
      let count = 0;
      const start = Date.now();

      await until(() => {
        count++;
        return count >= 3;
      });

      const elapsed = Date.now() - start;
      // 100ms * 2회 대기 = 200ms (첫 체크는 즉시), 타이머 오차 고려
      expect(elapsed).toBeGreaterThanOrEqual(190);
      expect(elapsed).toBeLessThan(350);
    });

    it("maxCount=1이면 한 번만 시도 후 에러", async () => {
      let count = 0;

      await expect(async () => {
        await until(() => {
          count++;
          return false;
        }, 10, 1);
      }).rejects.toThrow(TimeoutError);

      expect(count).toBe(1);
    });

    it("조건이 maxCount 내에 참이 되면 성공", async () => {
      let count = 0;

      await until(() => {
        count++;
        return count >= 3;
      }, 10, 5);

      expect(count).toBe(3);
    });
  });

  //#endregion
});
