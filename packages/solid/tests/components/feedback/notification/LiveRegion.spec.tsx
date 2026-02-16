import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import { useNotification } from "../../../../src/components/feedback/notification/NotificationContext";

describe("Notification Live Region", () => {
  it("Provider에 role=status인 live region이 있다", () => {
    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>content</NotificationProvider>
      </ConfigContext.Provider>
    ));

    const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it("알림 발생 시 live region 텍스트가 업데이트된다", async () => {
    let notification: ReturnType<typeof useNotification>;

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

    notification!.info("테스트 제목", "테스트 메시지");

    await waitFor(() => {
      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion?.textContent).toContain("알림: 테스트 제목");
      expect(liveRegion?.textContent).toContain("테스트 메시지");
    });
  });

  it("live region은 시각적으로 숨겨져 있다 (sr-only)", () => {
    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>content</NotificationProvider>
      </ConfigContext.Provider>
    ));

    const liveRegion = document.querySelector('[role="status"]');
    expect(liveRegion?.classList.contains("sr-only")).toBe(true);
  });
});
