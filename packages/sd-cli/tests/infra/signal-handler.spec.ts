import { describe, it } from "vitest";
import { SignalHandler } from "../../src/infra/SignalHandler";

describe("SignalHandler", () => {
  it("resolves waitForTermination on requestTermination", async () => {
    const handler = new SignalHandler();

    handler.requestTermination();

    await handler.waitForTermination();
  });

  it("handles double requestTermination gracefully", async () => {
    const handler = new SignalHandler();

    handler.requestTermination();
    handler.requestTermination();

    await handler.waitForTermination();
  });
});
