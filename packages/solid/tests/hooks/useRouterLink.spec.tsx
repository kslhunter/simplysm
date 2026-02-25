import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { Router } from "@solidjs/router";
import { useRouterLink } from "../../src";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("@solidjs/router", async () => {
  const actual = await vi.importActual("@solidjs/router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// window.open mock
const mockWindowOpen = vi.fn();

describe("useRouterLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "open").mockImplementation(mockWindowOpen);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const TestComponent = (props: {
    href: string;
    state?: Record<string, unknown>;
    windowOptions?: { width?: number; height?: number };
    onHandlerCreated?: (handler: (e: MouseEvent) => void) => void;
  }) => {
    const navigate = useRouterLink();
    const handler = navigate({
      href: props.href,
      state: props.state,
      window: props.windowOptions,
    });
    props.onHandlerCreated?.(handler);

    return (
      <button data-testid="test-button" onClick={handler}>
        Navigate
      </button>
    );
  };

  const renderWithRouter = (props: Parameters<typeof TestComponent>[0]) => {
    return render(() => (
      <Router base="" root={(routerProps) => routerProps.children}>
        {[
          {
            path: "*",
            component: () => <TestComponent {...props} />,
          },
        ]}
      </Router>
    ));
  };

  describe("Normal click (SPA routing)", () => {
    it("calls useNavigate", () => {
      const { getByTestId } = renderWithRouter({ href: "/dashboard" });

      fireEvent.click(getByTestId("test-button"));

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", undefined);
    });

    it("passes state to navigate if present", () => {
      const state = { from: "list" };
      const { getByTestId } = renderWithRouter({
        href: "/users/123",
        state,
      });

      fireEvent.click(getByTestId("test-button"));

      expect(mockNavigate).toHaveBeenCalledWith("/users/123", { state });
    });
  });

  describe("Ctrl/Cmd + click (new tab)", () => {
    it("opens new tab with window.open on Ctrl + click", () => {
      const { getByTestId } = renderWithRouter({ href: "/dashboard" });

      fireEvent.click(getByTestId("test-button"), { ctrlKey: true });

      expect(mockWindowOpen).toHaveBeenCalledWith("/dashboard", "_blank");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("opens new tab with window.open on Meta(Cmd) + click", () => {
      const { getByTestId } = renderWithRouter({ href: "/dashboard" });

      fireEvent.click(getByTestId("test-button"), { metaKey: true });

      expect(mockWindowOpen).toHaveBeenCalledWith("/dashboard", "_blank");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("opens new tab with window.open on Alt + click", () => {
      const { getByTestId } = renderWithRouter({ href: "/dashboard" });

      fireEvent.click(getByTestId("test-button"), { altKey: true });

      expect(mockWindowOpen).toHaveBeenCalledWith("/dashboard", "_blank");
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Shift + click (new window)", () => {
    it("opens new window with default size (800x800)", () => {
      const { getByTestId } = renderWithRouter({ href: "/dashboard" });

      fireEvent.click(getByTestId("test-button"), { shiftKey: true });

      expect(mockWindowOpen).toHaveBeenCalledWith("/dashboard", "", "width=800,height=800");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("opens new window with custom size", () => {
      const { getByTestId } = renderWithRouter({
        href: "/dashboard",
        windowOptions: { width: 1024, height: 768 },
      });

      fireEvent.click(getByTestId("test-button"), { shiftKey: true });

      expect(mockWindowOpen).toHaveBeenCalledWith("/dashboard", "", "width=1024,height=768");
    });
  });

  describe("Event handling", () => {
    it("calls e.preventDefault()", () => {
      let capturedHandler: ((e: MouseEvent) => void) | undefined;
      renderWithRouter({
        href: "/dashboard",
        onHandlerCreated: (h) => {
          capturedHandler = h;
        },
      });

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
      } as unknown as MouseEvent;

      capturedHandler?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("calls e.stopPropagation()", () => {
      let capturedHandler: ((e: MouseEvent) => void) | undefined;
      renderWithRouter({
        href: "/dashboard",
        onHandlerCreated: (h) => {
          capturedHandler = h;
        },
      });

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
      } as unknown as MouseEvent;

      capturedHandler?.(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });
});
