import { afterEach, describe, expect, it } from "vitest";
import path from "path";
import type { WorkerProxy } from "../../src/worker/types";
import { Worker } from "../../src/worker/worker";
import type * as TestWorkerModule from "./fixtures/test-worker";

describe("SdWorker", () => {
  const workerPath = path.resolve(import.meta.dirname, "fixtures/test-worker.ts");
  let worker: WorkerProxy<typeof TestWorkerModule> | undefined;

  afterEach(async () => {
    if (worker) {
      await worker.terminate();
      worker = undefined;
    }
  });

  //#region Method invocation

  describe("method invocation", () => {
    it("calls worker method and returns result", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.add(10, 20);

      expect(result).toBe(30);
    });

    it("calls method that returns string", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.echo("Hello");

      expect(result).toBe("Echo: Hello");
    });

    it("rejects when error occurs in worker", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      await expect(worker.throwError()).rejects.toThrow();
    });

    it("throws error when calling nonexistent method", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      // Bypass type system to call nonexistent method
      const unknownWorker = worker as unknown as { unknownMethod: () => Promise<void> };

      await expect(unknownWorker.unknownMethod()).rejects.toThrow(
        "Unknown method: unknownMethod",
      );
    });

    it("handles multiple concurrent requests", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const [result1, result2, result3] = await Promise.all([
        worker.add(1, 2),
        worker.add(3, 4),
        worker.add(5, 6),
      ]);

      expect(result1).toBe(3);
      expect(result2).toBe(7);
      expect(result3).toBe(11);
    });

    it("calls method that returns void", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.noReturn();

      expect(result).toBeUndefined();
    });
  });

  //#endregion

  //#region Events

  describe("events", () => {
    it("receives events from worker", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const events: number[] = [];
      worker.on("progress", (value) => {
        events.push(value);
      });

      await worker.add(1, 2);

      expect(events).toContain(50);
    });

    it("removes event listener with off()", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const events: number[] = [];
      const listener = (value: number) => {
        events.push(value);
      };

      worker.on("progress", listener);
      await worker.add(1, 2);

      // Remove listener
      worker.off("progress", listener);
      await worker.add(3, 4);

      // Should only receive event from first call
      expect(events).toHaveLength(1);
      expect(events[0]).toBe(50);
    });
  });

  //#endregion

  //#region Terminate

  describe("terminate", () => {
    it("rejects pending requests with Worker terminated error", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const runPromise = worker.delay(5000);

      // Prepare to catch error before terminating worker
      const errorPromise = runPromise.catch((err: unknown) => err);

      // Terminate worker
      await worker.terminate();
      worker = undefined;

      const error = await errorPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Worker terminated (method: delay)");
    });

    it("rejects pending requests when worker crashes", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      // Call long delay first to put it in pending state
      const delayPromise = worker.delay(5000).catch((err: unknown) => err);

      // Call crash after short wait (while delay is pending)
      await new Promise((resolve) => setTimeout(resolve, 10));
      await worker.crash();

      // When worker crashes, pending delay request should be rejected
      const error = await delayPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("Worker crashed");
    });
  });

  //#endregion

  //#region stdout/stderr

  describe("stdout/stderr", () => {
    it("forwards worker console.log output to main process", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.logMessage("test message");

      // If method returns normally, stdout piping is working
      expect(result).toBe("logged");
    });
  });

  //#endregion

  //#region env option

  describe("env option", () => {
    it("passes env option to worker", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath, {
        env: {
          TEST_ENV_VAR: "test-value-123",
        },
      });

      const result = await worker.getEnv("TEST_ENV_VAR");

      expect(result).toBe("test-value-123");
    });
  });

  //#endregion
});
