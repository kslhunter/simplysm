import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import { NotificationBanner } from "../../../../src/components/feedback/notification/NotificationBanner";
import { useNotification } from "../../../../src/components/feedback/notification/NotificationContext";

describe("NotificationBanner", () => {
  it("알림이 없으면 배너가 표시되지 않는다", () => {
    const { container } = render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <NotificationBanner />
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(container.querySelector("[data-notification-banner]")).toBeNull();
  });

  it("알림이 있으면 배너가 표시된다", async () => {
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

    notification!.info("테스트 제목", "테스트 메시지");

    await waitFor(() => {
      const banner = document.querySelector("[data-notification-banner]");
      expect(banner).not.toBeNull();
      expect(banner?.textContent).toContain("테스트 제목");
      expect(banner?.textContent).toContain("테스트 메시지");
    });
  });

  it("닫기 버튼 클릭 시 배너가 사라진다", async () => {
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

    notification!.info("테스트");

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")).not.toBeNull();
    });

    const closeButton = document.querySelector(
      "[data-notification-banner] [aria-label='알림 닫기']",
    );
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")).toBeNull();
    });
  });

  it("role=alert 속성이 있다", async () => {
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

    notification!.info("테스트");

    await waitFor(() => {
      const banner = document.querySelector("[data-notification-banner]");
      expect(banner?.getAttribute("role")).toBe("alert");
    });
  });

  it("테마별로 data-theme 속성이 설정된다", async () => {
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

    notification!.danger("에러");

    await waitFor(() => {
      const banner = document.querySelector("[data-notification-banner]");
      expect(banner?.getAttribute("data-theme")).toBe("danger");
    });
  });

  it("action이 있으면 액션 버튼이 표시된다", async () => {
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

    notification!.info("테스트", "메시지", {
      action: { label: "확인", onClick: handleAction },
    });

    await waitFor(() => {
      const actionButton = document.querySelector(
        "[data-notification-banner] button:not([aria-label])",
      );
      expect(actionButton?.textContent).toBe("확인");
    });

    const actionButton = document.querySelector(
      "[data-notification-banner] button:not([aria-label])",
    );
    fireEvent.click(actionButton!);

    expect(handleAction).toHaveBeenCalled();
  });

  it("새 알림이 오면 배너가 교체된다", async () => {
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

    notification!.info("첫 번째");

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")?.textContent).toContain(
        "첫 번째",
      );
    });

    notification!.info("두 번째");

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")?.textContent).toContain(
        "두 번째",
      );
    });
  });
});
