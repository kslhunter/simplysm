import { describe, it, expect } from "vitest";
import { wait, TimeoutError } from "@simplysm/core-common";

describe("Wait", () => {
  //#region time

  describe("time()", () => {
    it("지정된 시간만큼 대기", async () => {
      const start = Date.now();
      await wait.time(100);
      const elapsed = Date.now() - start;

      // 100ms ± tolerance - CI environment load and timer precision considered
      expect(elapsed).toBeGreaterThanOrEqual(95);
      expect(elapsed).toBeLessThan(250);
    });
  });

  //#endregion

  //#region until

  describe("until()", () => {
    it("조건이 true가 될 때까지 대기", async () => {
      let count = 0;

      await wait.until(() => {
        count++;
        return count >= 3;
      }, 10);

      expect(count).toBe(3);
    });

    it("비동기 조건 함수 지원", async () => {
      let count = 0;

      await wait.until(async () => {
        await wait.time(10);
        count++;
        return count >= 3;
      }, 10);

      expect(count).toBe(3);
    });

    it("조건이 이미 true이면 즉시 반환", async () => {
      const start = Date.now();
      await wait.until(() => true, 100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it("최대 시도 횟수 초과 시 TimeoutError 발생", async () => {
      let count = 0;

      await expect(async () => {
        await wait.until(
          () => {
            count++;
            return false;
          },
          10,
          5,
        );
      }).rejects.toThrow(TimeoutError);

      expect(count).toBe(5);
    });

    it("maxCount가 undefined이면 무한 대기", async () => {
      let count = 0;

      // Unlimited wait but returns when condition true
      await wait.until(
        () => {
          count++;
          return count >= 10;
        },
        10,
        undefined,
      );

      expect(count).toBe(10);
    });

    it("기본 밀리초는 100ms", async () => {
      let count = 0;
      const start = Date.now();

      await wait.until(() => {
        count++;
        return count >= 3;
      });

      const elapsed = Date.now() - start;
      // 100ms * 2 waits = 200ms (first check immediate), timer tolerance considered
      expect(elapsed).toBeGreaterThanOrEqual(190);
      expect(elapsed).toBeLessThan(350);
    });

    it("maxCount=1이면 한 번 시도 후 오류", async () => {
      let count = 0;

      await expect(async () => {
        await wait.until(
          () => {
            count++;
            return false;
          },
          10,
          1,
        );
      }).rejects.toThrow(TimeoutError);

      expect(count).toBe(1);
    });

  });

  //#endregion
});
