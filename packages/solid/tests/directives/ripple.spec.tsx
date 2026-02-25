import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Button } from "../../src/components/form-control/Button";

describe("ripple directive", () => {
  it("creates ripple indicator on button click", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full");
    expect(ripple).toBeTruthy();
  });

  it("does not create ripple for disabled button", () => {
    const { getByRole } = render(() => <Button disabled>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full");
    expect(ripple).toBeFalsy();
  });

  it("sets ripple opacity to 0 after pointerup", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full") as HTMLElement;
    expect(ripple).toBeTruthy();

    fireEvent.pointerUp(button);

    expect(ripple.style.opacity).toBe("0");
  });

  it("removes previous ripple and creates new ripple on rapid clicks", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    // First click
    fireEvent.pointerDown(button, { clientX: 30, clientY: 15 });
    const firstRipple = button.querySelector(".rounded-full");
    expect(firstRipple).toBeTruthy();

    // Second click (different location)
    fireEvent.pointerDown(button, { clientX: 70, clientY: 35 });
    const ripples = button.querySelectorAll(".rounded-full");

    // Only single ripple should exist
    expect(ripples.length).toBe(1);
  });

  it("creates ripple container and applies overflow hidden on first pointerdown", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    // Before pointerdown: no ripple container
    expect(button.children.length).toBe(0); // Only text node

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    // After pointerdown: ripple container is created
    expect(button.children.length).toBeGreaterThan(0);
    const container = button.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.style.overflow).toBe("hidden");
    // Parent button overflow is not changed
    expect(button.style.overflow).not.toBe("hidden");
  });

  it("maintains ripple while mouse is pressed", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full") as HTMLElement;
    expect(ripple).toBeTruthy();

    // Ripple should be maintained without pointerup
    // Opacity should still be 1 (fade out not started)
    expect(ripple.style.opacity).toBe("1");
  });

  it("applies ripple class for dark mode", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full") as HTMLElement;
    expect(ripple).toBeTruthy();

    // Check for classes supporting both light/dark mode
    expect(ripple.classList.contains("bg-black/20")).toBe(true);
    expect(ripple.classList.contains("dark:bg-white/20")).toBe(true);
  });

  it("fades out ripple on pointerleave", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full") as HTMLElement;
    expect(ripple).toBeTruthy();

    fireEvent.pointerLeave(button);

    expect(ripple.style.opacity).toBe("0");
  });

  it("fades out ripple on pointercancel", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { clientX: 50, clientY: 25 });

    const ripple = button.querySelector(".rounded-full") as HTMLElement;
    expect(ripple).toBeTruthy();

    fireEvent.pointerCancel(button);

    expect(ripple.style.opacity).toBe("0");
  });
});
