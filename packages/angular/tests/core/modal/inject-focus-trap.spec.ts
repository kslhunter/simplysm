import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { TestFocusTrapHost, TestFocusTrapEmpty } from "./inject-focus-trap-test.fixture";

function setup<T>(comp: new (...args: any[]) => T) {
  TestBed.configureTestingModule({ imports: [comp] });
  const fixture = TestBed.createComponent(comp);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

describe("injectFocusTrap", () => {
  it("Tab on last tabbable element wraps focus to first", () => {
    const fixture = setup(TestFocusTrapHost);
    const host = fixture.nativeElement as HTMLElement;
    const btn2 = host.querySelector(".btn2") as HTMLElement;
    const btn1 = host.querySelector(".btn1") as HTMLElement;

    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    fixture.componentInstance.focusTrap.handleTabTrap(event);

    expect(document.activeElement).toBe(btn1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Shift+Tab on first tabbable element wraps focus to last", () => {
    const fixture = setup(TestFocusTrapHost);
    const host = fixture.nativeElement as HTMLElement;
    const btn1 = host.querySelector(".btn1") as HTMLElement;
    const btn2 = host.querySelector(".btn2") as HTMLElement;

    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    fixture.componentInstance.focusTrap.handleTabTrap(event);

    expect(document.activeElement).toBe(btn2);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does nothing when no tabbable elements exist", () => {
    const fixture = setup(TestFocusTrapEmpty);

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });

    // Should not throw
    expect(() => {
      fixture.componentInstance.focusTrap.handleTabTrap(event);
    }).not.toThrow();

    expect(event.defaultPrevented).toBe(false);
  });

  it("Tab on middle element does not wrap", () => {
    const fixture = setup(TestFocusTrapHost);
    const host = fixture.nativeElement as HTMLElement;
    const input1 = host.querySelector(".input1") as HTMLElement;

    input1.focus();
    expect(document.activeElement).toBe(input1);

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    fixture.componentInstance.focusTrap.handleTabTrap(event);

    // Middle element — no wrapping, focus unchanged by handleTabTrap
    expect(document.activeElement).toBe(input1);
    expect(event.defaultPrevented).toBe(false);
  });
});
