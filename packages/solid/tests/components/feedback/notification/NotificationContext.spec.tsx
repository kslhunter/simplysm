import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { render, waitFor } from "@solidjs/testing-library";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import {
  useNotification,
  type NotificationContextValue,
} from "../../../../src/components/feedback/notification/NotificationContext";

describe("NotificationContext", () => {
  describe("useNotification", () => {
    it("throws error when used without Provider", () => {
      createRoot((dispose) => {
        expect(() => useNotification()).toThrow(
          "useNotification can only be used inside NotificationProvider",
        );
        dispose();
      });
    });
  });
});

describe("NotificationProvider", () => {
  it("useNotification works normally inside Provider", () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(notification!.items()).toEqual([]);
    expect(notification!.unreadCount()).toBe(0);
  });

  it("adds notification when info is called", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("Test Title", "Test Message");

    await waitFor(() => {
      expect(notification!.items().length).toBe(1);
      expect(notification!.items()[0].theme).toBe("info");
      expect(notification!.items()[0].title).toBe("Test Title");
      expect(notification!.items()[0].message).toBe("Test Message");
      expect(notification!.unreadCount()).toBe(1);
    });
  });

  it("correctly applies success/warning/danger themes", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.success("Success", "Success message");
    notification!.warning("Warning", "Warning message");
    notification!.danger("Error", "Error message");

    await waitFor(() => {
      const items = notification!.items();
      expect(items[0].theme).toBe("success");
      expect(items[1].theme).toBe("warning");
      expect(items[2].theme).toBe("danger");
    });
  });

  it("marks notification as read when markAsRead is called", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("Test", "Message");

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(1);
    });

    const id = notification!.items()[0].id;
    notification!.markAsRead(id);

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(0);
      expect(notification!.items()[0].read).toBe(true);
    });
  });

  it("removes all notifications when clear is called", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("Notification 1");
    notification!.info("Notification 2");

    await waitFor(() => {
      expect(notification!.items().length).toBe(2);
    });

    notification!.clear();

    await waitFor(() => {
      expect(notification!.items().length).toBe(0);
    });
  });

  it("maintains maximum 50 notifications", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    // Add 51 notifications
    for (let i = 0; i < 51; i++) {
      notification!.info(`Notification ${i}`);
    }

    await waitFor(() => {
      expect(notification!.items().length).toBe(50);
      // First notification deleted, last notification retained
      expect(notification!.items()[49].title).toBe("Notification 50");
    });
  });

  it("latestUnread returns the most recent unread notification", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("First");
    notification!.info("Second");

    await waitFor(() => {
      expect(notification!.latestUnread()?.title).toBe("Second");
    });
  });

  it("latestUnread becomes undefined and marked as read when dismissBanner is called", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("Test");

    await waitFor(() => {
      expect(notification!.latestUnread()).toBeDefined();
    });

    notification!.dismissBanner();

    await waitFor(() => {
      expect(notification!.latestUnread()).toBeUndefined();
      // Still exists in items but marked as read
      expect(notification!.items().length).toBe(1);
      expect(notification!.items()[0].read).toBe(true);
      expect(notification!.unreadCount()).toBe(0);
    });
  });

  it("returns id of created notification when info is called", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    const id = notification!.info("Test Title");

    await waitFor(() => {
      expect(typeof id).toBe("string");
      expect(notification!.items()[0].id).toBe(id);
    });
  });

  it("updates notification content when update is called", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    const id = notification!.info("Original Title", "Original Message");

    notification!.update(id, { title: "Updated Title", message: "Updated Message" });

    await waitFor(() => {
      const item = notification!.items()[0];
      expect(item.title).toBe("Updated Title");
      expect(item.message).toBe("Updated Message");
    });
  });

  it("removes notification when remove is called", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    const id = notification!.info("Notification to delete");
    notification!.info("Notification to keep");

    await waitFor(() => {
      expect(notification!.items().length).toBe(2);
    });

    notification!.remove(id);

    await waitFor(() => {
      expect(notification!.items().length).toBe(1);
      expect(notification!.items()[0].title).toBe("Notification to keep");
    });
  });

  it("update with renotify: read notification changes back to unread", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    const id = notification!.info("Notification");
    notification!.markAsRead(id);

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(0);
    });

    notification!.update(id, { message: "Done!" }, { renotify: true });

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(1);
      expect(notification!.items()[0].read).toBe(false);
    });
  });

  it("update with renotify: unread notification remains unread", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    const id = notification!.info("Notification");

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(1);
    });

    notification!.update(id, { message: "Updated" }, { renotify: true });

    await waitFor(() => {
      // Still 1 (not increased)
      expect(notification!.unreadCount()).toBe(1);
    });
  });
});
