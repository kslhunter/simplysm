import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { Invalid } from "../../../src/components/form-control/Invalid";

describe("Invalid component", () => {
  describe("Fragment rendering", () => {
    it("renders children and hidden input without wrapper div", () => {
      const { container } = render(() => (
        <Invalid message="error">
          <div data-testid="child">Content</div>
        </Invalid>
      ));
      const child = container.querySelector("[data-testid='child']");
      const hiddenInput = container.querySelector("input[aria-hidden='true']");
      expect(child).toBeTruthy();
      expect(hiddenInput).toBeTruthy();
      expect(child!.parentElement).toBe(container);
    });
  });

  describe("setCustomValidity", () => {
    it("sets setCustomValidity when message is present", () => {
      const { container } = render(() => (
        <Invalid message="This is a required field">
          <div>Content</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("is valid when no message is provided", () => {
      const { container } = render(() => (
        <Invalid>
          <div>Content</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("updates setCustomValidity when message changes", () => {
      const [msg, setMsg] = createSignal<string | undefined>("error");
      const { container } = render(() => (
        <Invalid message={msg()}>
          <div>Content</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("error");

      setMsg(undefined);
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });

  describe("variant='border'", () => {
    it("adds border-danger-500 class to target when message is present", () => {
      const { container } = render(() => (
        <Invalid variant="border" message="error">
          <div data-testid="target" class="border">
            Content
          </div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      expect(target.classList.contains("border-danger-500")).toBe(true);
    });

    it("does not have border-danger-500 class when no message", () => {
      const { container } = render(() => (
        <Invalid variant="border">
          <div data-testid="target" class="border">
            Content
          </div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      expect(target.classList.contains("border-danger-500")).toBe(false);
    });
  });

  describe("variant='dot' (default)", () => {
    it("inserts dot element inside target when message is present", () => {
      const { container } = render(() => (
        <Invalid message="error">
          <div data-testid="target">Content</div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      const dot = target.querySelector("[data-invalid-dot]");
      expect(dot).toBeTruthy();
    });

    it("has no dot element when no message", () => {
      const { container } = render(() => (
        <Invalid>
          <div data-testid="target">Content</div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      const dot = target.querySelector("[data-invalid-dot]");
      expect(dot).toBeFalsy();
    });
  });

  describe("touchMode", () => {
    it("has no visual indication initially in touchMode", () => {
      const { container } = render(() => (
        <Invalid variant="border" message="error" touchMode>
          <div data-testid="target" class="border">
            Content
          </div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      expect(target.classList.contains("border-danger-500")).toBe(false);
    });

    it("setCustomValidity is always set in touchMode", () => {
      const { container } = render(() => (
        <Invalid variant="border" message="error" touchMode>
          <div>Content</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("error");
    });
  });
});
