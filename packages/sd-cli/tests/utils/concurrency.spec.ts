import { describe, it, expect } from "vitest";

describe("runWithConcurrency", () => {
  it("limits concurrent task execution to specified concurrency", async () => {
    const { runWithConcurrency } = await import("../../src/utils/concurrency");

    let activeTasks = 0;
    let maxActiveTasks = 0;

    const tasks = Array.from({ length: 10 }, () => async () => {
      activeTasks++;
      maxActiveTasks = Math.max(maxActiveTasks, activeTasks);
      await new Promise((resolve) => setTimeout(resolve, 10));
      activeTasks--;
      return "done";
    });

    const results = await runWithConcurrency(tasks, 3);

    expect(maxActiveTasks).toBeLessThanOrEqual(3);
    expect(results).toHaveLength(10);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });

  it("returns all results in order even when individual tasks fail", async () => {
    const { runWithConcurrency } = await import("../../src/utils/concurrency");

    const tasks = [
      () => Promise.resolve("a"),
      () => { throw new Error("fail"); },
      () => Promise.resolve("c"),
    ];

    const results = await runWithConcurrency(tasks, 2);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ status: "fulfilled", value: "a" });
    expect(results[1].status).toBe("rejected");
    expect(results[2]).toEqual({ status: "fulfilled", value: "c" });
  });

  it("handles empty task list", async () => {
    const { runWithConcurrency } = await import("../../src/utils/concurrency");

    const results = await runWithConcurrency([], 3);
    expect(results).toHaveLength(0);
  });

  it("works when concurrency exceeds task count", async () => {
    const { runWithConcurrency } = await import("../../src/utils/concurrency");

    const tasks = [() => Promise.resolve(1), () => Promise.resolve(2)];
    const results = await runWithConcurrency(tasks, 10);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });
});

describe("getMaxConcurrency", () => {
  it("returns at least 1", async () => {
    const { getMaxConcurrency } = await import("../../src/utils/concurrency");
    expect(getMaxConcurrency()).toBeGreaterThanOrEqual(1);
  });
});
