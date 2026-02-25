// packages/service-common/tests/define-event.spec.ts
import { describe, it, expect } from "vitest";
import { defineEvent } from "@simplysm/service-common";

describe("defineEvent", () => {
  it("주어진 이름으로 이벤트 정의 생성", () => {
    const evt = defineEvent<{ channel: string }, string>("OrderUpdated");
    expect(evt.eventName).toBe("OrderUpdated");
  });

  it("타입 추론에 사용 가능 (컴파일 타임 확인)", () => {
    const _evt = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

    // 타입 레벨 확인 — 잘못되면 컴파일 타임에 실패함
    const info: typeof _evt.$info = { orderId: 123 };
    const data: typeof _evt.$data = { status: "shipped" };

    expect(info.orderId).toBe(123);
    expect(data.status).toBe("shipped");
  });
});
