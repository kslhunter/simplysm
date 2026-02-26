import { render, cleanup } from "@solidjs/testing-library";
import { useI18n, useI18nOptional, I18nProvider } from "../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../src/providers/ConfigContext";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("I18nProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("should translate keys in current locale", () => {
    let result = "";
    render(() => (
      <ConfigProvider clientName="testApp">
        <I18nProvider>
          {(() => {
            const i18n = useI18n();
            i18n.setLocale("en");
            result = i18n.t("calendar.weeks.sun");
            return null;
          })()}
        </I18nProvider>
      </ConfigProvider>
    ));
    expect(result).toBe("Sun");
  });

  it("should fallback to en when key not found in ko", () => {
    let result = "";
    render(() => (
      <ConfigProvider clientName="testApp">
        <I18nProvider>
          {(() => {
            const i18n = useI18n();
            i18n.setLocale("ko");
            result = i18n.t("unknown.key");
            return null;
          })()}
        </I18nProvider>
      </ConfigProvider>
    ));
    expect(result).toBe("unknown.key");
  });

  it("should interpolate template parameters", () => {
    let result = "";
    render(() => (
      <ConfigProvider clientName="testApp">
        <I18nProvider>
          {(() => {
            const i18n = useI18n();
            i18n.setLocale("en");
            result = i18n.t("statePreset.savedMessage", { name: "test" });
            return null;
          })()}
        </I18nProvider>
      </ConfigProvider>
    ));
    expect(result).toBe('Preset "test" has been saved.');
  });

  it("should change locale with setLocale", () => {
    let result = "";
    render(() => (
      <ConfigProvider clientName="testApp">
        <I18nProvider>
          {(() => {
            const i18n = useI18n();
            i18n.setLocale("ko");
            result = i18n.t("calendar.weeks.sun");
            return null;
          })()}
        </I18nProvider>
      </ConfigProvider>
    ));
    expect(result).toBe("일");
  });

  it("should configure and merge dictionaries", () => {
    let result = "";
    render(() => (
      <ConfigProvider clientName="testApp">
        <I18nProvider>
          {(() => {
            const i18n = useI18n();
            i18n.configure({
              locale: "ja",
              dict: {
                ja: { "calendar.weeks.sun": "日" },
              },
            });
            result = i18n.t("calendar.weeks.sun");
            return null;
          })()}
        </I18nProvider>
      </ConfigProvider>
    ));
    expect(result).toBe("日");
  });

  it("should work without provider (optional hook)", () => {
    const i18n = useI18nOptional();
    expect(i18n).toBeUndefined();
  });
});
