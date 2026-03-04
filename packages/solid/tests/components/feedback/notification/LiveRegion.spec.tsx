import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, beforeEach } from "vitest";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { useNotification } from "../../../../src/components/feedback/notification/NotificationProvider";

describe("Notification Live Region", () => {
  beforeEach(() => {
    localStorage.setItem("testApp.i18n-locale", JSON.stringify("en"));
  });

  it("updates live region text when notification occurs", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <I18nProvider>
          <NotificationProvider>
            {(() => {
              notification = useNotification();
              return null;
            })()}
          </NotificationProvider>
        </I18nProvider>
      </ConfigContext.Provider>
    ));

    notification!.info("Test Title", "Test Message");

    await waitFor(() => {
      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion?.textContent).toContain("Notification: Test Title");
      expect(liveRegion?.textContent).toContain("Test Message");
    });
  });

});
