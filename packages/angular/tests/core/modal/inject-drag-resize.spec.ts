import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { TestDragResizeHost } from "./inject-drag-resize-test.fixture";

function setup() {
  TestBed.configureTestingModule({ imports: [TestDragResizeHost] });
  const fixture = TestBed.createComponent(TestDragResizeHost);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

describe("injectDragResize", () => {
  it("startDrag + mousemove changes dialog position", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const dialogEl = comp.getDialogEl()!;

    comp.dragResize.startDrag(
      new MouseEvent("mousedown", { clientX: 100, clientY: 50 }),
    );

    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 200, clientY: 100 }),
    );

    expect(dialogEl.style.left).not.toBe("");
    expect(dialogEl.style.top).not.toBe("");

    document.dispatchEvent(new MouseEvent("mouseup"));
  });

  it("startResize + mousemove changes dialog size", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const dialogEl = comp.getDialogEl()!;

    comp.dragResize.startResize(
      new MouseEvent("mousedown", { clientX: 400, clientY: 150 }),
      "right",
    );

    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 500, clientY: 150 }),
    );

    const width = parseInt(dialogEl.style.width || "0", 10);
    expect(width).toBeGreaterThan(0);

    document.dispatchEvent(new MouseEvent("mouseup"));
  });

  it("onEnd callback is called on mouseup after drag", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;

    comp.dragResize.startDrag(
      new MouseEvent("mousedown", { clientX: 100, clientY: 50 }),
    );

    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 150, clientY: 50 }),
    );
    document.dispatchEvent(new MouseEvent("mouseup"));

    expect(comp.endCalled).toBe(true);
  });

  it("resize respects minWidthPx", () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const dialogEl = comp.getDialogEl()!;

    comp.minWidthPx.set(300);

    comp.dragResize.startResize(
      new MouseEvent("mousedown", { clientX: 100, clientY: 150 }),
      "left",
    );

    // drag left handle far to the right to shrink beyond min
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 500, clientY: 150 }),
    );

    const width = parseInt(dialogEl.style.width || "0", 10);
    expect(width).toBeGreaterThanOrEqual(300);

    document.dispatchEvent(new MouseEvent("mouseup"));
  });
});
