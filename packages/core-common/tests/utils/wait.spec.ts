import { describe, it, expect } from "vitest";
import { waitTime as time, waitUntil as until, TimeoutError } from "@simplysm/core-common";

describe("Wait", () => {
  //#region time

  describe("time()", () => {
    it("Waits for specified time", async () => {
      const start = Date.now();
      await time(100);
      const elapsed = Date.now() - start;

      // 100ms ± tolerance - CI environment load and timer precision considered
      expect(elapsed).toBeGreaterThanOrEqual(95);
      expect(elapsed).toBeLessThan(250);
    });

    it("Works normally with 0ms wait", async () => {
      const start = Date.now();
      await time(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  //#endregion

  //#region until

  describe("until()", () => {
    it("Waits until condition becomes true", async () => {
      let count = 0;

      await until(() => {
        count++;
        return count >= 3;
      }, 10);

      expect(count).toBe(3);
    });

    it("Supports async condition function", async () => {
      let count = 0;

      await until(async () => {
        await time(10);
        count++;
        return count >= 3;
      }, 10);

      expect(count).toBe(3);
    });

    it("Returns immediately if condition already true", async () => {
      const start = Date.now();
      await until(() => true, 100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it("Throws TimeoutError on max attempts exceeded", async () => {
      let count = 0;

      await expect(async () => {
        await until(
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

    it("Waits indefinitely if maxCount undefined", async () => {
      let count = 0;

      // Unlimited wait but returns when condition true
      await until(
        () => {
          count++;
          return count >= 10;
        },
        10,
        undefined,
      );

      expect(count).toBe(10);
    });

    it("Default milliseconds is 100ms", async () => {
      let count = 0;
      const start = Date.now();

      await until(() => {
        count++;
        return count >= 3;
      });

      const elapsed = Date.now() - start;
      // 100ms * 2 waits = 200ms (first check immediate), timer tolerance considered
      expect(elapsed).toBeGreaterThanOrEqual(190);
      expect(elapsed).toBeLessThan(350);
    });

    it("With maxCount=1, tries once then errors", async () => {
      let count = 0;

      await expect(async () => {
        await until(
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

    it("Success if condition true within maxCount", async () => {
      let count = 0;

      await until(
        () => {
          count++;
          return count >= 3;
        },
        10,
        5,
      );

      expect(count).toBe(3);
    });
  });

  //#endregion
});
