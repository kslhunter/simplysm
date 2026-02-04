import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationProvider } from "../../../src/components/notification/NotificationProvider";
import { NotificationBell } from "../../../src/components/notification/NotificationBell";
import { useNotification } from "../../../src/components/notification/NotificationContext";

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("버튼이 렌더링된다", () => {
    const { container } = render(() => (
      <NotificationProvider>
        <NotificationBell />
      </NotificationProvider>
    ));

    expect(container.querySelector("[data-notification-bell]")).not.toBeNull();
  });

  it("알림이 없으면 뱃지가 표시되지 않는다", () => {
    render(() => (
      <NotificationProvider>
        <NotificationBell />
      </NotificationProvider>
    ));

    const badge = document.querySelector("[data-notification-badge]");
    expect(badge).toBeNull();
  });

  it("알림이 있으면 뱃지에 개수가 표시된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
    ));

    notification!.info("알림1");
    notification!.info("알림2");

    await waitFor(() => {
      const badge = document.querySelector("[data-notification-badge]");
      expect(badge?.textContent).toBe("2");
    });
  });

  it("버튼 클릭 시 Dropdown이 열린다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
    ));

    notification!.info("테스트");

    const button = document.querySelector("[data-notification-bell]");
    fireEvent.click(button!);

    await waitFor(() => {
      const dropdown = document.querySelector("[data-dropdown]");
      expect(dropdown).not.toBeNull();
    });
  });

  it("Dropdown에 알림 목록이 표시된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
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

  it("aria-label에 알림 개수가 포함된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
    ));

    notification!.info("알림");

    await waitFor(() => {
      const button = document.querySelector("[data-notification-bell]");
      expect(button?.getAttribute("aria-label")).toContain("1");
    });
  });

  it("aria-haspopup과 aria-expanded가 올바르게 설정된다", async () => {
    render(() => (
      <NotificationProvider>
        <NotificationBell />
      </NotificationProvider>
    ));

    const button = document.querySelector("[data-notification-bell]");
    expect(button?.getAttribute("aria-haspopup")).toBe("true");
    expect(button?.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button!);

    await waitFor(() => {
      expect(button?.getAttribute("aria-expanded")).toBe("true");
    });
  });

  it("알림 클릭 시 markAsRead가 호출된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
    ));

    notification!.info("테스트");

    const button = document.querySelector("[data-notification-bell]");
    fireEvent.click(button!);

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    const listItem = document.querySelector("[data-list-item]");
    fireEvent.click(listItem!);

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(0);
    });
  });

  it("전체 삭제 버튼 클릭 시 clear가 호출된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
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
