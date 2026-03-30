// packages/service-common/tests/define-event.spec.ts
import { describe, it, expect } from "vitest";
import { defineEvent } from "@simplysm/service-common";

describe("defineEvent", () => {
  it("create event definition with given name", () => {
    const evt = defineEvent<{ channel: string }, string>("OrderUpdated");
    expect(evt.eventName).toBe("OrderUpdated");
  });

});
