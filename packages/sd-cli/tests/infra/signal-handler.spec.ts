import { describe, it, expect } from "vitest";
import { SignalHandler } from "../../src/infra/SignalHandler";

describe("SignalHandler", () => {
  it("resolves waitForTermination on requestTermination", async () => {
    const handler = new SignalHandler();

    expect(handler.isTerminated()).toBe(false);

    handler.requestTermination();

    await handler.waitForTermination();
    expect(handler.isTerminated()).toBe(true);
  });

  it("is not terminated initially", () => {
    const handler = new SignalHandler();
    expect(handler.isTerminated()).toBe(false);
    // Clean up: prevent dangling signal listeners
    handler.requestTermination();
  });

  it("handles double requestTermination gracefully", async () => {
    const handler = new SignalHandler();

    handler.requestTermination();
    handler.requestTermination();

    await handler.waitForTermination();
    expect(handler.isTerminated()).toBe(true);
  });
});
