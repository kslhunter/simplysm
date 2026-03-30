import { describe, it, expect, vi } from "vitest";
import type { Renderer2 } from "@angular/core";
import { setSafeStyle } from "../../../src/core/utils/setSafeStyle";

describe("Feature 1.6 Slice 1: setSafeStyle", () => {
  it("빈 스타일 객체 전달 시 setStyle이 호출되지 않는다", () => {
    const renderer = { setStyle: vi.fn() } as unknown as Renderer2;
    const el = document.createElement("div");

    setSafeStyle(renderer, el, {});

    expect(renderer.setStyle).not.toHaveBeenCalled();
  });

  it("스타일 객체의 각 속성별로 renderer.setStyle이 호출된다", () => {
    const renderer = { setStyle: vi.fn() } as unknown as Renderer2;
    const el = document.createElement("div");

    setSafeStyle(renderer, el, { position: "relative", overflow: "hidden" });

    expect(renderer.setStyle).toHaveBeenCalledWith(el, "position", "relative");
    expect(renderer.setStyle).toHaveBeenCalledWith(el, "overflow", "hidden");
    expect(renderer.setStyle).toHaveBeenCalledTimes(2);
  });
});
