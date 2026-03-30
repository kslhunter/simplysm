import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SerialQueue, SdError } from "@simplysm/core-common";

describe("SerialQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  //#region Sequential execution

  describe("순차 실행", () => {
    it("큐에 등록된 함수를 순서대로 실행", async () => {
      const queue = new SerialQueue();
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

      await vi.advanceTimersByTimeAsync(50);

      expect(calls).toEqual([1, 2, 3]);
    });

    it("이전 작업 완료 후 다음 작업 실행", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];
      const timestamps: number[] = [];

      queue.run(async () => {
        timestamps.push(Date.now());
        calls.push(1);
        await new Promise((r) => setTimeout(r, 50));
      });
      queue.run(async () => {
        timestamps.push(Date.now());
        calls.push(2);
        await new Promise((r) => setTimeout(r, 50));
      });

      await vi.advanceTimersByTimeAsync(200);

      expect(calls).toEqual([1, 2]);
      // Second task starts after first task completes (exactly 50ms)
      expect(timestamps[1] - timestamps[0]).toBe(50);
    });

    it("실행 중 추가된 작업을 순차적으로 실행", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      queue.run(async () => {
        calls.push(1);
        await new Promise((r) => setTimeout(r, 50));
      });

      // Wait for first task to start
      await vi.advanceTimersByTimeAsync(10);

      // Add task during execution
      queue.run(() => {
        calls.push(2);
      });

      await vi.advanceTimersByTimeAsync(100);

      expect(calls).toEqual([1, 2]);
    });
  });

  //#endregion

  //#region Gap interval

  describe("간격 인터벌", () => {
    it("설정된 경우 작업 사이에 간격 시간만큼 대기", async () => {
      const queue = new SerialQueue(50);
      const timestamps: number[] = [];

      queue.run(() => {
        timestamps.push(Date.now());
      });
      queue.run(() => {
        timestamps.push(Date.now());
      });

      await vi.advanceTimersByTimeAsync(150);

      expect(timestamps).toHaveLength(2);
      // Exactly 50ms gap between two tasks
      expect(timestamps[1] - timestamps[0]).toBe(50);
    });

    it("간격이 0일 때 다음 작업을 즉시 실행", async () => {
      const queue = new SerialQueue(0);
      const timestamps: number[] = [];

      queue.run(() => {
        timestamps.push(Date.now());
      });
      queue.run(() => {
        timestamps.push(Date.now());
      });

      await vi.advanceTimersByTimeAsync(50);

      expect(timestamps).toHaveLength(2);
      // Gap is 0
      expect(timestamps[1] - timestamps[0]).toBe(0);
    });

  });

  //#endregion

  //#region Error handling

  describe("오류 처리", () => {
    it("오류 발생 시 error 이벤트 발생", async () => {
      const queue = new SerialQueue();
      const errors: SdError[] = [];

      queue.on("error", (err) => {
        errors.push(err);
      });

      queue.run(() => {
        throw new Error("test error");
      });

      await vi.advanceTimersByTimeAsync(50);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(SdError);
      expect(errors[0].message).toContain("큐 작업");
      expect(errors[0].message).toContain("test error");
    });

    it("오류 후에도 다음 작업 계속 실행", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];
      const errors: SdError[] = [];

      // Add error listener to prevent unhandled rejection
      queue.on("error", (err) => {
        errors.push(err);
      });

      queue.run(() => {
        calls.push(1);
        throw new Error("error");
      });
      queue.run(() => {
        calls.push(2);
      });
      queue.run(() => {
        calls.push(3);
      });

      await vi.advanceTimersByTimeAsync(100);

      expect(calls).toEqual([1, 2, 3]);
      expect(errors).toHaveLength(1);
    });

    it("복수 오류 발생 시에도 모든 작업 실행", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];
      const errors: SdError[] = [];

      queue.on("error", (err) => {
        errors.push(err);
      });

      queue.run(() => {
        calls.push(1);
        throw new Error("error 1");
      });
      queue.run(() => {
        calls.push(2);
      });
      queue.run(() => {
        calls.push(3);
        throw new Error("error 3");
      });

      await vi.advanceTimersByTimeAsync(100);

      expect(calls).toEqual([1, 2, 3]);
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toContain("error 1");
      expect(errors[1].message).toContain("error 3");
    });
  });

  //#endregion

  //#region dispose

  describe("dispose()", () => {
    it("대기 중인 큐 비우기", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      // First task is executing
      queue.run(async () => {
        calls.push(1);
        await new Promise((r) => setTimeout(r, 100));
      });

      // Add pending tasks
      queue.run(() => {
        calls.push(2);
      });
      queue.run(() => {
        calls.push(3);
      });

      // Call dispose after first task starts
      await vi.advanceTimersByTimeAsync(20);
      queue.dispose();

      // Wait for all tasks to complete
      await vi.advanceTimersByTimeAsync(150);

      // Only first task executes (running tasks complete)
      expect(calls).toEqual([1]);
    });

    it("dispose 후 새 작업이 정상 실행", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.dispose();

      // Add new task after dispose
      queue.run(() => {
        calls.push(2);
      });

      await vi.advanceTimersByTimeAsync(50);

      expect(calls).toContain(2);
    });

    it("using 문으로 자동 dispose", async () => {
      const calls: number[] = [];
      {
        using queue = new SerialQueue();
        queue.run(async () => {
          calls.push(1);
          await new Promise((r) => setTimeout(r, 100));
        });
        queue.run(() => {
          calls.push(2);
        });
        await vi.advanceTimersByTimeAsync(20);
      } // dispose called automatically when using block ends
      await vi.advanceTimersByTimeAsync(150);
      // First task (running) completes, but pending tasks don't execute
      expect(calls).toEqual([1]);
    });
  });

  //#endregion

  //#region Synchronous function support

  describe("동기 함수 지원", () => {
    it("동기 및 비동기 함수 혼합 사용 가능", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.run(async () => {
        await new Promise((r) => setTimeout(r, 10));
        calls.push(2);
      });
      queue.run(() => {
        calls.push(3);
      });

      await vi.advanceTimersByTimeAsync(100);

      expect(calls).toEqual([1, 2, 3]);
    });
  });

  //#endregion
});
