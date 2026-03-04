import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { Sidebar, type SidebarUserMenu } from "../../../../src";

describe("SidebarUser", () => {
  beforeEach(() => {
    // requestAnimationFrame mock (for Collapse animation)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("click behavior", () => {
    it("does not open dropdown when clicked without menus", () => {
      const { container } = render(() => <Sidebar.User name="User" />);

      const button = container.querySelector("button")!;
      fireEvent.click(button);

      // aria-expanded not present or unchanged
      expect(button.hasAttribute("aria-expanded")).toBe(false);
    });

    it("toggles dropdown when clicked with menus", () => {
      const menus: SidebarUserMenu[] = [{ title: "Logout", onClick: () => {} }];

      const { container } = render(() => <Sidebar.User name="User" menus={menus} />);

      const button = container.querySelector("button")!;

      // Initial state: closed
      expect(button.getAttribute("aria-expanded")).toBe("false");

      // First click: open
      fireEvent.click(button);
      expect(button.getAttribute("aria-expanded")).toBe("true");

      // Second click: close
      fireEvent.click(button);
      expect(button.getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("menu item click", () => {
    it("calls onClick when menu item is clicked", () => {
      const onLogout = vi.fn();
      const menus: SidebarUserMenu[] = [{ title: "Logout", onClick: onLogout }];

      const { container, getByText } = render(() => <Sidebar.User name="User" menus={menus} />);

      // Open dropdown
      const button = container.querySelector("button")!;
      fireEvent.click(button);

      // Click menu item
      fireEvent.click(getByText("Logout"));

      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it("closes dropdown when menu item is clicked", () => {
      const menus: SidebarUserMenu[] = [{ title: "Profile", onClick: () => {} }];

      const { container, getByText } = render(() => <Sidebar.User name="User" menus={menus} />);

      const button = container.querySelector("button")!;

      // Open dropdown
      fireEvent.click(button);
      expect(button.getAttribute("aria-expanded")).toBe("true");

      // Click menu item
      fireEvent.click(getByText("Profile"));

      // Dropdown closed
      expect(button.getAttribute("aria-expanded")).toBe("false");
    });
  });

});
