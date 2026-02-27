import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Collapse } from "../../../src";

describe("Collapse", () => {
  // requestAnimationFrame mock
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("sets visibility:hidden when open={false}", () => {
      const { container } = render(() => <Collapse open={false}>Content</Collapse>);
      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;
      expect(contentDiv.style.visibility).toBe("hidden");
    });

    it("sets content visible when open={true}", () => {
      const { container } = render(() => <Collapse open={true}>Content</Collapse>);
      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;
      expect(contentDiv.style.visibility).not.toBe("hidden");
    });

    it("treats undefined open as false (visibility:hidden)", () => {
      const { container } = render(() => <Collapse>Content</Collapse>);
      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;
      expect(contentDiv.style.visibility).toBe("hidden");
    });

    it("renders correctly with no children", () => {
      const { container } = render(() => <Collapse open={false} />);
      expect(container.firstChild).toBeTruthy();
    });

    it("merges custom classes", () => {
      const { container } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Collapse open={true} class="my-test-class">
          Content
        </Collapse>
      ));
      expect(container.querySelector(".my-test-class")).toBeTruthy();
      // overflow: hidden is applied as inline style
      const rootDiv = container.querySelector("[data-collapse]") as HTMLElement;
      expect(rootDiv.style.overflow).toBe("hidden");
    });
  });

  describe("margin-top calculation", () => {
    it("sets margin-top to negative content height when open={false}", async () => {
      const { container } = render(() => (
        <Collapse open={false}>
          <div style={{ height: "100px" }}>Content</div>
        </Collapse>
      ));
      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;
      expect(contentDiv).toBeTruthy();

      // wait for ResizeObserver to finish measuring
      await waitFor(() => {
        const marginTop = contentDiv.style.marginTop;
        // verify margin-top is negative (actual height measured)
        expect(marginTop).toMatch(/^-\d+px$/);
        expect(parseInt(marginTop)).toBeLessThan(0);
      });
    });

    it("clears margin-top when open={true}", () => {
      const { container } = render(() => (
        <Collapse open={true}>
          <div style={{ height: "100px" }}>Content</div>
        </Collapse>
      ));
      const contentDiv = container.querySelector("[data-collapse]")?.firstElementChild;
      const marginTop = (contentDiv as HTMLElement).style.marginTop;
      expect(!marginTop || marginTop === "").toBeTruthy();
    });
  });

  describe("initial render and transition", () => {
    it("applies transition class after mount", () => {
      const { container } = render(() => <Collapse open={false}>Content</Collapse>);
      const contentDiv = container.querySelector("[data-collapse]")?.firstElementChild;
      expect(contentDiv?.classList.contains("transition-[margin-top]")).toBeTruthy();
    });

    it("retains transition class and updates margin-top on open state change", async () => {
      const [open, setOpen] = createSignal(false);
      const { container } = render(() => (
        <Collapse open={open()}>
          <div style={{ height: "100px" }}>Content</div>
        </Collapse>
      ));

      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;

      // initial state: closed, negative margin-top
      await waitFor(() => {
        expect(parseInt(contentDiv.style.marginTop)).toBeLessThan(0);
      });
      expect(contentDiv.classList.contains("transition-[margin-top]")).toBeTruthy();
      expect(contentDiv.classList.contains("duration-200")).toBeTruthy();

      // change to open state
      setOpen(true);

      // transition class retained, margin-top updated
      await waitFor(() => {
        const marginTop = contentDiv.style.marginTop;
        expect(!marginTop || marginTop === "").toBeTruthy();
      });
      expect(contentDiv.classList.contains("transition-[margin-top]")).toBeTruthy();
    });
  });

  describe("dynamic state changes", () => {
    it("updates visibility when open state changes", () => {
      const [open, setOpen] = createSignal(false);
      const { container } = render(() => <Collapse open={open()}>Content</Collapse>);

      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;
      expect(contentDiv.style.visibility).toBe("hidden");

      setOpen(true);
      expect(contentDiv.style.visibility).not.toBe("hidden");
    });

    it("recalculates margin-top when content height changes", async () => {
      const [showExtra, setShowExtra] = createSignal(false);
      const { container } = render(() => (
        <Collapse open={false}>
          <div style={{ height: "50px" }}>Base Content</div>
          {showExtra() && <div style={{ height: "50px" }}>Extra Content</div>}
        </Collapse>
      ));

      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;

      // wait for initial height measurement
      await waitFor(() => {
        const initialMarginTop = parseInt(contentDiv.style.marginTop);
        expect(initialMarginTop).toBeLessThan(0);
      });

      const initialMarginTop = parseInt(contentDiv.style.marginTop);

      // add content to change height
      setShowExtra(true);

      // wait for ResizeObserver to detect new height and recalculate margin-top
      await waitFor(() => {
        const newMarginTop = parseInt(contentDiv.style.marginTop);
        // new margin-top should be more negative than initial (larger content)
        expect(newMarginTop).toBeLessThan(initialMarginTop);
      });
    });
  });
});
