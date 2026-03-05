import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { Router } from "@solidjs/router";
import { Sidebar, type AppMenu } from "../../../../src";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

// Mock pathname signal
import { createSignal } from "solid-js";
const [mockPathname, setMockPathname] = createSignal("/");

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
vi.mock("@solidjs/router", async () => {
  const actual = await vi.importActual("@solidjs/router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      get pathname() {
        return mockPathname();
      },
    }),
  };
});

// window.open mock
const mockWindowOpen = vi.fn();

describe("SidebarMenu", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
    vi.clearAllMocks();
    setMockPathname("/"); // Initialize pathname
    vi.spyOn(window, "open").mockImplementation(mockWindowOpen);
    // requestAnimationFrame mock (for Collapse animation)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithRouter = (menus: AppMenu[]) => {
    return render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <Router base="" root={(props) => props.children}>
            {[
              {
                path: "*",
                component: () => <Sidebar.Menu menus={menus} />,
              },
            ]}
          </Router>
        </I18nProvider>
      </ConfigProvider>
    ));
  };

  describe("link behavior", () => {
    it("navigates using SPA routing on internal link click", () => {
      const menus: AppMenu[] = [{ title: "Dashboard", href: "/dashboard" }];

      const { getByText } = renderWithRouter(menus);

      fireEvent.click(getByText("Dashboard"));

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("opens external link in new tab on click", () => {
      const menus: AppMenu[] = [{ title: "External Link", href: "https://example.com" }];

      const { getByText } = renderWithRouter(menus);

      fireEvent.click(getByText("External Link"));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        "https://example.com",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  describe("expand/collapse behavior", () => {
    it("toggles expanded when clicking menu with children", () => {
      const menus: AppMenu[] = [
        {
          title: "Settings",
          children: [{ title: "Profile", href: "/settings/profile" }],
        },
      ];

      const { getByText, container } = renderWithRouter(menus);

      // Initial state: collapsed
      const listItem = container.querySelector("[data-list-item]") as HTMLElement;
      expect(listItem.getAttribute("aria-expanded")).toBe("false");

      // After click: expanded
      fireEvent.click(getByText("Settings"));
      expect(listItem.getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("pathname reactivity", () => {
    it("automatically expands parent menu when pathname matches nested menu", () => {
      // Set initial pathname to nested menu path
      setMockPathname("/settings/profile");

      const menus: AppMenu[] = [
        { title: "Dashboard", href: "/dashboard" },
        {
          title: "Settings",
          children: [
            { title: "Profile", href: "/settings/profile" },
            { title: "Security", href: "/settings/security" },
          ],
        },
      ];

      const { container } = renderWithRouter(menus);

      // "Settings" menu should automatically expand
      const settingsItem = container.querySelectorAll("[data-list-item]")[1] as HTMLElement;
      expect(settingsItem.getAttribute("aria-expanded")).toBe("true");
    });

    it("expands parent menu of matching pathname when pathname changes", () => {
      const menus: AppMenu[] = [
        { title: "Dashboard", href: "/dashboard" },
        {
          title: "Settings",
          children: [{ title: "Profile", href: "/settings/profile" }],
        },
      ];

      const { container } = renderWithRouter(menus);

      // Initial state: Settings menu collapsed
      const settingsItem = container.querySelectorAll("[data-list-item]")[1] as HTMLElement;
      expect(settingsItem.getAttribute("aria-expanded")).toBe("false");

      // Change pathname
      setMockPathname("/settings/profile");

      // Settings menu should expand
      expect(settingsItem.getAttribute("aria-expanded")).toBe("true");
    });
  });

});
