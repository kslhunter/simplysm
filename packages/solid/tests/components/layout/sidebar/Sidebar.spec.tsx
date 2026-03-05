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

import { Sidebar, useSidebar } from "../../../../src";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

// ToggleCapture helper - Extract setToggle from Context for external control
const ToggleCapture: Component<{ onCapture: (setToggle: Setter<boolean>) => void }> = (props) => {
  const { setToggle } = useSidebar();
   
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
});
