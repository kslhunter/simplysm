import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import { NotificationBell } from "../../../../src/components/feedback/notification/NotificationBell";
import { useNotification } from "../../../../src/components/feedback/notification/NotificationContext";

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders button", () => {
    const { container } = render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <NotificationBell />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(container.querySelector("[data-notification-bell]")).not.toBeNull();
  });

  it("does not show badge when there are no notifications", () => {
    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <NotificationBell />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    const badge = document.querySelector("[data-notification-badge]");
    expect(badge).toBeNull();
  });

  it("shows count on badge when notifications are present", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBell />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("알림1");
    notification!.info("알림2");

    await waitFor(() => {
      const badge = document.querySelector("[data-notification-badge]");
      expect(badge?.textContent).toBe("2");
    });
  });

  it("opens Dropdown on button click", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBell />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("테스트");

    const button = document.querySelector("[data-notification-bell]");
    fireEvent.click(button!);

    await waitFor(() => {
      const dropdown = document.querySelector("[data-dropdown]");
      expect(dropdown).not.toBeNull();
    });
  });

  it("shows notification list in Dropdown", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBell />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("알림1", "메시지1");
    notification!.success("알림2", "메시지2");

    const button = document.querySelector("[data-notification-bell]");
    fireEvent.click(button!);

    await waitFor(() => {
      const dropdown = document.querySelector("[data-dropdown]");
      expect(dropdown?.textContent).toContain("알림1");
      expect(dropdown?.textContent).toContain("알림2");
    });
  });

  it("includes notification count in aria-label", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBell />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("알림");

    await waitFor(() => {
      const button = document.querySelector("[data-notification-bell]");
      expect(button?.getAttribute("aria-label")).toContain("1");
    });
  });

  it("sets aria-haspopup and aria-expanded correctly", async () => {
    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <NotificationBell />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    const button = document.querySelector("[data-notification-bell]");
    expect(button?.getAttribute("aria-haspopup")).toBe("true");
    expect(button?.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button!);

    await waitFor(() => {
      expect(button?.getAttribute("aria-expanded")).toBe("true");
    });
  });

  it("marks all notifications as read when dropdown opens", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBell />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("테스트1");
    notification!.info("테스트2");

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(2);
    });

    const button = document.querySelector("[data-notification-bell]");
    fireEvent.click(button!);

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(0);
    });
  });

  it("calls clear when clear-all button is clicked", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBell />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("알림1");
    notification!.info("알림2");

    const button = document.querySelector("[data-notification-bell]");
    fireEvent.click(button!);

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    const clearButton = document.querySelector("[data-notification-clear]");
    fireEvent.click(clearButton!);

    await waitFor(() => {
      expect(notification!.items().length).toBe(0);
    });
  });
});
