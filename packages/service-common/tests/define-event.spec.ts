// packages/service-common/tests/define-event.spec.ts
import { describe, it, expect } from "vitest";
import { defineEvent } from "@simplysm/service-common";

describe("defineEvent", () => {
  it("creates an event definition with the given name", () => {
    const evt = defineEvent<{ channel: string }, string>("OrderUpdated");
    expect(evt.eventName).toBe("OrderUpdated");
  });

  it("can be used for type inference (compile-time check)", () => {
    const _evt = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

    // Type-level checks — these would fail at compile time if wrong
    const info: typeof _evt.$info = { orderId: 123 };
    const data: typeof _evt.$data = { status: "shipped" };

    expect(info.orderId).toBe(123);
    expect(data.status).toBe("shipped");
  });
});
