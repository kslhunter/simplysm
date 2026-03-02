import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { PwaUpdateProvider } from "../../src/providers/PwaUpdateProvider";
import { NotificationProvider } from "../../src/components/feedback/notification/NotificationProvider";
import { I18nProvider } from "../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../src/providers/ConfigContext";

describe("PwaUpdateProvider", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children correctly", () => {
    const { getByText } = render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <NotificationProvider>
            <PwaUpdateProvider>
              <div>child content</div>
            </PwaUpdateProvider>
          </NotificationProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    expect(getByText("child content")).toBeDefined();
  });
});
