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

  describe("rendering", () => {
    it("renders name prop", () => {
      const { getByText } = render(() => <Sidebar.User name="User Name" />);

      expect(getByText("User Name")).toBeTruthy();
    });

    it("does not have aria-expanded when menus are not provided", () => {
      const { container } = render(() => <Sidebar.User name="User" />);

      const button = container.querySelector("button");
      expect(button?.hasAttribute("aria-expanded")).toBe(false);
    });

    it("has aria-expanded=false when menus are provided", () => {
      const menus: SidebarUserMenu[] = [{ title: "Logout", onClick: () => {} }];

      const { container } = render(() => <Sidebar.User name="User" menus={menus} />);

      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-expanded")).toBe("false");
    });
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

  describe("styles based on menu presence", () => {
    it("styles differ based on menus prop", () => {
      const menus: SidebarUserMenu[] = [{ title: "Logout", onClick: () => {} }];

      const { container: withoutMenus } = render(() => <Sidebar.User name="User" />);
      const { container: withMenus } = render(() => <Sidebar.User name="User" menus={menus} />);

      const buttonWithout = withoutMenus.querySelector("button")!;
      const buttonWith = withMenus.querySelector("button")!;

      expect(buttonWithout.className).not.toBe(buttonWith.className);
    });
  });

  describe("style merging", () => {
    it("merges custom classes", () => {
      const { container } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Sidebar.User name="User" class="my-custom-class" />
      ));

      expect(container.querySelector(".my-custom-class")).toBeTruthy();
    });
  });
});
