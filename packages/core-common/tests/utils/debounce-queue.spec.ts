import { describe, it, expect } from "vitest";
import { DebounceQueue, waitTime as time, SdError } from "@simplysm/core-common";

describe("DebounceQueue", () => {
  //#region Debounce behavior

  describe("Debounce behavior", () => {
    it("Executes only last request", async () => {
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

    it("Executes after delay", async () => {
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

    it("Executes immediately if no delay", async () => {
      const queue = new DebounceQueue();
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });

      // Small wait (event loop)
      await time(10);

      expect(calls).toEqual([1]);
    });

    it("If new request arrives during execution, executes after completion", async () => {
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

  describe("Error handling", () => {
    it("Emits error event on error", async () => {
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
      expect(errors[0].message).toContain("Error occurred while executing task");
      expect(errors[0].message).toContain("test error");
    });

    it("Next request executes normally even if error occurred", async () => {
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

    it("pendingFn executes even if error occurred during execution", async () => {
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
    it("Clears pending tasks and timers", async () => {
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

    it("New tasks ignored after dispose", async () => {
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

    it("Safe to call multiple times", () => {
      const queue = new DebounceQueue(50);

      // Multiple calls without error
      queue.dispose();
      queue.dispose();
      queue.dispose();
    });

    it("Auto-disposed with using statement", async () => {
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

  //#region Synchronous function support

  describe("Synchronous function support", () => {
    it("Can execute synchronous function", async () => {
      const queue = new DebounceQueue(10);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });

      await time(50);

      expect(calls).toEqual([1]);
    });

    it("Can mix synchronous and asynchronous functions", async () => {
      const queue = new DebounceQueue(10);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.run(async () => {
        await time(10);
        calls.push(2);
      });
      queue.run(() => {
        calls.push(3);
      });

      await time(100);

      // Only last request executed
      expect(calls).toEqual([3]);
    });
  });

  //#endregion
});
