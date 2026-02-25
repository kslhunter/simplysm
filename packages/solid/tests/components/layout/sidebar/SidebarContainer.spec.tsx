import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Component, Setter } from "solid-js";

// Media query mock
const mockCreateMediaQuery = vi.fn(() => () => true as boolean);
vi.mock("@solid-primitives/media", () => ({
  createMediaQuery: () => mockCreateMediaQuery(),
}));

// @solidjs/router mock
vi.mock("@solidjs/router", () => ({
  useBeforeLeave: vi.fn(),
  useLocation: vi.fn(() => ({ pathname: "/" })),
  useNavigate: vi.fn(() => vi.fn()),
}));

import { Sidebar, useSidebarContext } from "../../../../src";

// ToggleCapture helper - Extract setToggle from Context for external control
const ToggleCapture: Component<{ onCapture: (setToggle: Setter<boolean>) => void }> = (props) => {
  const { setToggle } = useSidebarContext();
  props.onCapture(setToggle);
  return null;
};

describe("SidebarContainer component", () => {
  beforeEach(() => {
    mockCreateMediaQuery.mockReturnValue(() => true); // Desktop mode
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("displays children inside container", () => {
      const { getByText } = render(() => (
        <Sidebar.Container>
          <span>Content</span>
        </Sidebar.Container>
      ));

      expect(getByText("Content")).toBeTruthy();
    });
  });

  describe("padding-left handling", () => {
    it("applies padding-left when open on desktop", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // Desktop

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      // toggle=false (initial) → open on desktop
      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.paddingLeft).toBe("16rem");
    });

    it("removes padding-left when closed on desktop", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // Desktop
      let setToggle!: Setter<boolean>;

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture onCapture={(fn) => (setToggle = fn)} />
          <div>Content</div>
        </Sidebar.Container>
      ));

      setToggle(true); // Switch to closed
      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.paddingLeft).toBe("");
    });

    it("has no padding-left on mobile", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // Mobile

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.paddingLeft).toBe("");
    });
  });

  describe("backdrop rendering", () => {
    it("renders backdrop when open on mobile", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // Mobile
      let setToggle!: Setter<boolean>;

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture onCapture={(fn) => (setToggle = fn)} />
          <div>Content</div>
        </Sidebar.Container>
      ));

      setToggle(true); // Open on mobile
      const backdrop = container.querySelector('[role="button"][aria-label="Close sidebar"]');
      expect(backdrop).toBeTruthy();
    });

    it("does not render backdrop when closed on mobile", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // Mobile

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      // toggle=false (initial) → closed on mobile
      const backdrop = container.querySelector('[role="button"][aria-label="Close sidebar"]');
      expect(backdrop).toBeFalsy();
    });

    it("does not render backdrop on desktop", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // Desktop

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const backdrop = container.querySelector('[role="button"][aria-label="Close sidebar"]');
      expect(backdrop).toBeFalsy();
    });
  });

  describe("backdrop click events", () => {
    it("closes sidebar when backdrop is clicked", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // Mobile
      let setToggle!: Setter<boolean>;
      let toggleValue = false;

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture
            onCapture={(fn) => {
              setToggle = fn;
            }}
          />
          <Sidebar>Sidebar Content</Sidebar>
          <div>Content</div>
        </Sidebar.Container>
      ));

      setToggle(true); // Switch to open state
      // Wrap setToggle to track changes
      const originalSetToggle = setToggle;
      setToggle = ((val: boolean) => {
        toggleValue = val;
        originalSetToggle(val);
      }) as Setter<boolean>;

      const backdrop = container.querySelector(
        '[role="button"][aria-label="Close sidebar"]',
      ) as HTMLElement;
      expect(backdrop).toBeTruthy();

      fireEvent.click(backdrop);

      // Verify toggle changed to false
      expect(toggleValue).toBe(false);
    });

    it("closes sidebar when Escape key is pressed on backdrop", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // Mobile
      let setToggle!: Setter<boolean>;
      let toggleValue = false;

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture
            onCapture={(fn) => {
              setToggle = fn;
            }}
          />
          <Sidebar>Sidebar Content</Sidebar>
          <div>Content</div>
        </Sidebar.Container>
      ));

      setToggle(true); // Switch to open state
      // Wrap setToggle to track changes
      const originalSetToggle = setToggle;
      setToggle = ((val: boolean) => {
        toggleValue = val;
        originalSetToggle(val);
      }) as Setter<boolean>;

      const backdrop = container.querySelector(
        '[role="button"][aria-label="Close sidebar"]',
      ) as HTMLElement;
      expect(backdrop).toBeTruthy();

      fireEvent.keyDown(backdrop, { key: "Escape" });

      expect(toggleValue).toBe(false);
    });
  });

  describe("style merging", () => {
    it("merges custom classes", () => {
      const { container } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Sidebar.Container class="my-custom-class">
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.classList.contains("my-custom-class")).toBe(true);
    });

    it("merges custom styles", () => {
      const { container } = render(() => (
        <Sidebar.Container style={{ "background-color": "red" }}>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.backgroundColor).toBe("red");
    });
  });
});
