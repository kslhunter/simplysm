import { describe, it, expect } from "vitest";
import { DebounceQueue, wait, SdError } from "@simplysm/core-common";

const time = wait.time;

describe("DebounceQueue", () => {
  //#region Debounce behavior

  describe("디바운스 동작", () => {
    it("마지막 요청만 실행", async () => {
      const queue = new DebounceQueue(50);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.run(() => {
        calls.push(2);
      });
      queue.run(() => {
        calls.push(3);
      });

      // Wait for debounce
      await time(100);

      // Only last request executed
      expect(calls).toEqual([3]);
    });

    it("지연 후 실행", async () => {
      const queue = new DebounceQueue(100);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });

      // After 50ms not yet executed
      await time(50);
      expect(calls).toEqual([]);

      // After 100ms executed
      await time(100);
      expect(calls).toEqual([1]);
    });

    it("지연 없으면 즉시 실행", async () => {
      const queue = new DebounceQueue();
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });

      // Small wait (event loop)
      await time(10);

      expect(calls).toEqual([1]);
    });

    it("실행 중 새 요청 도착 시 완료 후 실행", async () => {
      const queue = new DebounceQueue(10);
      const calls: number[] = [];

      queue.run(async () => {
        calls.push(1);
        await time(50); // Wait during execution
      });

      // Wait for first execution start
      await time(20);

      // Add new request during execution
      queue.run(() => {
        calls.push(2);
      });

      // Wait for all work to complete
      await time(100);

      expect(calls).toEqual([1, 2]);
    });
  });

  //#endregion

  //#region Error handling

  describe("오류 처리", () => {
    it("오류 시 error 이벤트 발생", async () => {
      const queue = new DebounceQueue(10);
      const errors: SdError[] = [];

      queue.on("error", (err) => {
        errors.push(err);
      });

      queue.run(() => {
        throw new Error("test error");
      });

      await time(50);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(SdError);
      expect(errors[0].message).toContain("작업 실행");
      expect(errors[0].message).toContain("test error");
    });

    it("오류 발생 후에도 다음 요청 정상 실행", async () => {
      const queue = new DebounceQueue(10);
      const calls: number[] = [];
      const errors: SdError[] = [];

      // Add error listener to prevent unhandled rejection
      queue.on("error", (err) => {
        errors.push(err);
      });

      queue.run(() => {
        throw new Error("error");
      });

      await time(50);

      queue.run(() => {
        calls.push(1);
      });

      await time(50);

      expect(calls).toEqual([1]);
      expect(errors).toHaveLength(1);
    });

    it("실행 중 오류 발생해도 pendingFn 실행", async () => {
      const queue = new DebounceQueue(10);
      const calls: number[] = [];
      const errors: SdError[] = [];

      queue.on("error", (err) => {
        errors.push(err);
      });

      // First request: error occurs
      queue.run(() => {
        calls.push(1);
        throw new Error("error 1");
      });

      await time(20);

      // Add new request during execution
      queue.run(() => {
        calls.push(2);
      });

      await time(100);

      expect(calls).toEqual([1, 2]);
      expect(errors).toHaveLength(1);
    });
  });

  //#endregion

  //#region dispose

  describe("dispose()", () => {
    it("대기 중인 작업 및 타이머 비우기", async () => {
      const queue = new DebounceQueue(100);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });

      // Dispose during debounce wait
      await time(50);
      queue.dispose();

      // After debounce time passes, still not executed
      await time(100);

      expect(calls).toEqual([]);
    });

    it("dispose 후 새 작업 무시됨", async () => {
      const queue = new DebounceQueue(50);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.dispose();

      // Add new task after dispose - ignored
      queue.run(() => {
        calls.push(2);
      });

      await time(100);

      // Tasks after dispose not executed
      expect(calls).toEqual([]);
    });

    it("using 문으로 자동 dispose", async () => {
      const calls: number[] = [];
      {
        using queue = new DebounceQueue(100);
        queue.run(() => {
          calls.push(1);
        });
        await time(50);
      } // dispose automatically called at using block end
      await time(100);
      // Disposed during debounce wait, not executed
      expect(calls).toEqual([]);
    });
  });

  //#endregion

});
