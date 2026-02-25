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

  describe("Sequential execution", () => {
    it("Executes queued functions in order", async () => {
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

    it("Executes next task after previous task completes", async () => {
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

    it("Executes tasks added during execution sequentially", async () => {
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

  describe("Gap interval", () => {
    it("Waits gap duration between tasks when set", async () => {
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

    it("Executes next task immediately when gap is 0", async () => {
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

    it("Default gap is 0", async () => {
      const queue = new SerialQueue();
      const timestamps: number[] = [];

      queue.run(() => {
        timestamps.push(Date.now());
      });
      queue.run(() => {
        timestamps.push(Date.now());
      });

      await vi.advanceTimersByTimeAsync(50);

      expect(timestamps).toHaveLength(2);
      expect(timestamps[1] - timestamps[0]).toBe(0);
    });

    it("Does not wait gap after the last task", async () => {
      const queue = new SerialQueue(100);
      const timestamps: number[] = [];

      queue.run(() => {
        timestamps.push(Date.now());
      });
      queue.run(() => {
        timestamps.push(Date.now());
      });

      // Wait long enough (task1 + gap100 + task2)
      await vi.advanceTimersByTimeAsync(200);

      // Verify gap was applied (exactly 100ms)
      expect(timestamps).toHaveLength(2);
      expect(timestamps[1] - timestamps[0]).toBe(100);
    });
  });

  //#endregion

  //#region Error handling

  describe("Error handling", () => {
    it("Emits error event when error occurs", async () => {
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
      expect(errors[0].message).toContain("Error during queue task execution");
      expect(errors[0].message).toContain("test error");
    });

    it("Continues executing next task even after error", async () => {
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

    it("Executes all tasks even if multiple errors occur", async () => {
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
    it("Clears pending queue", async () => {
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

    it("New tasks execute normally after dispose", async () => {
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

    it("Safe to call multiple times", () => {
      const queue = new SerialQueue();

      // Multiple calls without error
      queue.dispose();
      queue.dispose();
      queue.dispose();
    });

    it("Automatically disposes with using statement", async () => {
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

  describe("Synchronous function support", () => {
    it("Can execute synchronous functions", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.run(() => {
        calls.push(2);
      });

      await vi.advanceTimersByTimeAsync(50);

      expect(calls).toEqual([1, 2]);
    });

    it("Can mix synchronous and asynchronous functions", async () => {
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
