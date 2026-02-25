import { describe, it, expect, afterEach } from "vitest";
import { SignalHandler } from "../../src/infra/SignalHandler";

describe("SignalHandler", () => {
  afterEach(() => {
    // Clean up process listeners between tests
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  });

  it("resolves waitForTermination when termination is requested", async () => {
    const handler = new SignalHandler();

    // Request termination asynchronously
    setTimeout(() => handler.requestTermination(), 10);

    await expect(handler.waitForTermination()).resolves.toBeUndefined();
  });

  it("returns termination status correctly", () => {
    const handler = new SignalHandler();

    expect(handler.isTerminated()).toBe(false);

    handler.requestTermination();

    expect(handler.isTerminated()).toBe(true);
  });

  it("ignores duplicate termination requests", () => {
    const handler = new SignalHandler();

    handler.requestTermination();
    handler.requestTermination(); // Second call is ignored

    expect(handler.isTerminated()).toBe(true);
  });
});
