import { render } from "@solidjs/testing-library";
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
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

// ToggleCapture helper - Extract setToggle from Context for external control
const ToggleCapture: Component<{ onCapture: (setToggle: Setter<boolean>) => void }> = (props) => {
  const { setToggle } = useSidebarContext();
  props.onCapture(setToggle);
  return null;
};

describe("Sidebar component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
    mockCreateMediaQuery.mockReturnValue(() => true); // Desktop mode
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("displays children inside sidebar", () => {
      const { getByText } = render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Sidebar.Container>
              <Sidebar>
                <span>Sidebar content</span>
              </Sidebar>
            </Sidebar.Container>
          </I18nProvider>
        </ConfigProvider>
      ));

      expect(getByText("Sidebar content")).toBeTruthy();
    });

    it("renders as aside element", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Sidebar.Container>
              <Sidebar>Content</Sidebar>
            </Sidebar.Container>
          </I18nProvider>
        </ConfigProvider>
      ));

      expect(container.querySelector("aside")).toBeTruthy();
    });
  });

  describe("open/closed state", () => {
    it("on desktop with toggle=false shows open state (translateX(0))", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // Desktop

      const { container } = render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Sidebar.Container>
              <Sidebar>Content</Sidebar>
            </Sidebar.Container>
          </I18nProvider>
        </ConfigProvider>
      ));

      // toggle=false (initial) → open on desktop
      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(0px)");
    });

    it("on desktop with toggle=true shows closed state (translateX(-100%))", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // Desktop
      let setToggle!: Setter<boolean>;

      const { container } = render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Sidebar.Container>
              <ToggleCapture onCapture={(fn) => (setToggle = fn)} />
              <Sidebar>Content</Sidebar>
            </Sidebar.Container>
          </I18nProvider>
        </ConfigProvider>
      ));

      setToggle(true); // Switch to closed
      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(-100%)");
    });

    it("on mobile with toggle=false shows closed state (translateX(-100%))", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // Mobile

      const { container } = render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Sidebar.Container>
              <Sidebar>Content</Sidebar>
            </Sidebar.Container>
          </I18nProvider>
        </ConfigProvider>
      ));

      // toggle=false (initial) → closed on mobile
      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(-100%)");
    });

    it("on mobile with toggle=true shows open state (translateX(0))", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // Mobile
      let setToggle!: Setter<boolean>;

      const { container } = render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Sidebar.Container>
              <ToggleCapture onCapture={(fn) => (setToggle = fn)} />
              <Sidebar>Content</Sidebar>
            </Sidebar.Container>
          </I18nProvider>
        </ConfigProvider>
      ));

      setToggle(true); // Switch to open
      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(0px)");
    });
  });

  describe("aria attributes", () => {
    it("has aria-hidden=false when open", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // Desktop

      const { container } = render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Sidebar.Container>
              <Sidebar>Content</Sidebar>
            </Sidebar.Container>
          </I18nProvider>
        </ConfigProvider>
      ));

      // toggle=false (initial) → open on desktop
      const sidebar = container.querySelector("aside");
      expect(sidebar?.getAttribute("aria-hidden")).toBe("false");
    });

    it("has aria-hidden=true when closed", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // Mobile

      const { container } = render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Sidebar.Container>
              <Sidebar>Content</Sidebar>
            </Sidebar.Container>
          </I18nProvider>
        </ConfigProvider>
      ));

      // toggle=false (initial) → closed on mobile
      const sidebar = container.querySelector("aside");
      expect(sidebar?.getAttribute("aria-hidden")).toBe("true");
    });

    it("sets inert attribute when closed", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // Mobile

      const { container } = render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Sidebar.Container>
              <Sidebar>Content</Sidebar>
            </Sidebar.Container>
          </I18nProvider>
        </ConfigProvider>
      ));

      // toggle=false (initial) → closed on mobile
      const sidebar = container.querySelector("aside");
      expect(sidebar?.hasAttribute("inert")).toBe(true);
    });
  });

  describe("style merging", () => {
    it("merges custom classes", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test">
          <I18nProvider>
            <Sidebar.Container>
              {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
              <Sidebar class="my-custom-class">Content</Sidebar>
            </Sidebar.Container>
          </I18nProvider>
        </ConfigProvider>
      ));

      const sidebar = container.querySelector("aside");
      expect(sidebar?.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("Context usage", () => {
    it("throws error when useSidebarContext is used outside SidebarContainer", () => {
      const TestComponent = () => {
        useSidebarContext();
        return <div>Test</div>;
      };

      expect(() => render(() => <TestComponent />)).toThrow(
        "useSidebarContext can only be used inside SidebarContainer",
      );
    });
  });
});
