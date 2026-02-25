import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import { NotificationBanner } from "../../../../src/components/feedback/notification/NotificationBanner";
import { useNotification } from "../../../../src/components/feedback/notification/NotificationContext";

describe("NotificationBanner", () => {
  it("does not display banner when no notification", () => {
    const { container } = render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <NotificationBanner />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(container.querySelector("[data-notification-banner]")).toBeNull();
  });

  it("displays banner when notification is present", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBanner />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("Test Title", "Test Message");

    await waitFor(() => {
      const banner = document.querySelector("[data-notification-banner]");
      expect(banner).not.toBeNull();
      expect(banner?.textContent).toContain("Test Title");
      expect(banner?.textContent).toContain("Test Message");
    });
  });

  it("closes banner when close button is clicked", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBanner />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("Test");

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")).not.toBeNull();
    });

    const closeButton = document.querySelector(
      "[data-notification-banner] [aria-label='Close notification']",
    );
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")).toBeNull();
    });
  });

  it("has role=alert attribute", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBanner />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("Test");

    await waitFor(() => {
      const banner = document.querySelector("[data-notification-banner]");
      expect(banner?.getAttribute("role")).toBe("alert");
    });
  });

  it("sets data-theme attribute for each theme", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBanner />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.danger("Error");

    await waitFor(() => {
      const banner = document.querySelector("[data-notification-banner]");
      expect(banner?.getAttribute("data-theme")).toBe("danger");
    });
  });

  it("displays action button when action is present", async () => {
    let notification: ReturnType<typeof useNotification>;
    const handleAction = vi.fn();

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBanner />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("Test", "Message", {
      action: { label: "Confirm", onClick: handleAction },
    });

    await waitFor(() => {
      const actionButton = document.querySelector(
        "[data-notification-banner] button:not([aria-label])",
      );
      expect(actionButton?.textContent).toBe("Confirm");
    });

    const actionButton = document.querySelector(
      "[data-notification-banner] button:not([aria-label])",
    );
    fireEvent.click(actionButton!);

    expect(handleAction).toHaveBeenCalled();
  });

  it("replaces banner when new notification arrives", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
          <NotificationBanner />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("First");

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")?.textContent).toContain("First");
    });

    notification!.info("Second");

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")?.textContent).toContain(
        "Second",
      );
    });
  });
});
