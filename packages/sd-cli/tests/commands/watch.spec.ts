import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(async () => {}),
  start: vi.fn(async () => {}),
  awaitTermination: vi.fn(async () => {}),
  shutdown: vi.fn(async () => {}),
  ctor: vi.fn(),
}));

vi.mock("../../src/orchestrators/DevWatchOrchestrator", () => ({
  DevWatchOrchestrator: vi.fn().mockImplementation(function (this: any, options: any) {
    mocks.ctor(options);
    this.initialize = mocks.initialize;
    this.start = mocks.start;
    this.awaitTermination = mocks.awaitTermination;
    this.shutdown = mocks.shutdown;
  }),
}));

const { runWatch } = await import("../../src/commands/watch");

describe("runWatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initialize.mockResolvedValue(undefined);
    mocks.start.mockResolvedValue(undefined);
    mocks.awaitTermination.mockResolvedValue(undefined);
    mocks.shutdown.mockResolvedValue(undefined);
  });

  it("creates DevWatchOrchestrator with mode:watch and runs lifecycle", async () => {
    await runWatch({ targets: ["core-common"], options: ["-o", "fast"] });

    expect(mocks.ctor).toHaveBeenCalledWith({
      mode: "watch",
      targets: ["core-common"],
      options: ["-o", "fast"],
    });

    expect(mocks.initialize).toHaveBeenCalledOnce();
    expect(mocks.start).toHaveBeenCalledOnce();
    expect(mocks.awaitTermination).toHaveBeenCalledOnce();
    expect(mocks.shutdown).toHaveBeenCalledOnce();
  });

  it("calls shutdown even when initialize throws", async () => {
    mocks.initialize.mockRejectedValueOnce(new Error("config error"));

    await expect(runWatch({ targets: [], options: [] })).rejects.toThrow("config error");
    expect(mocks.shutdown).toHaveBeenCalledOnce();
  });
});
