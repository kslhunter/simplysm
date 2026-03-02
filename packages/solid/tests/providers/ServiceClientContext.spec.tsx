import { describe, it, expect, beforeEach } from "vitest";
import { createRoot } from "solid-js";
import { render } from "@solidjs/testing-library";
import {
  useServiceClient,
  type ServiceClientContextValue,
} from "../../src/providers/ServiceClientContext";
import { ServiceClientProvider } from "../../src/providers/ServiceClientProvider";
import { NotificationProvider } from "../../src/components/feedback/notification/NotificationProvider";
import { ConfigContext } from "../../src/providers/ConfigContext";
import { I18nProvider } from "../../src/providers/i18n/I18nContext";

describe("ServiceClientContext", () => {
  beforeEach(() => {
    localStorage.setItem("testApp.i18n-locale", JSON.stringify("en"));
  });

  describe("useServiceClient", () => {
    it("throws error when used without Provider", () => {
      createRoot((dispose) => {
        expect(() => useServiceClient()).toThrow(
          "useServiceClient can only be used inside ServiceClientProvider",
        );
        dispose();
      });
    });
  });
});

describe("ServiceClientProvider", () => {
  beforeEach(() => {
    localStorage.setItem("testApp.i18n-locale", JSON.stringify("en"));
  });

  it("useServiceClient works correctly inside Provider", () => {
    let serviceClient: ServiceClientContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <I18nProvider>
          <NotificationProvider>
            <ServiceClientProvider>
              {(() => {
                serviceClient = useServiceClient();
                return null;
              })()}
            </ServiceClientProvider>
          </NotificationProvider>
        </I18nProvider>
      </ConfigContext.Provider>
    ));

    expect(serviceClient!).toBeDefined();
    expect(typeof serviceClient!.connect).toBe("function");
    expect(typeof serviceClient!.close).toBe("function");
    expect(typeof serviceClient!.get).toBe("function");
    expect(typeof serviceClient!.isConnected).toBe("function");
  });

  it("throws error when get is called with unconnected client key", () => {
    let serviceClient: ServiceClientContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <I18nProvider>
          <NotificationProvider>
            <ServiceClientProvider>
              {(() => {
                serviceClient = useServiceClient();
                return null;
              })()}
            </ServiceClientProvider>
          </NotificationProvider>
        </I18nProvider>
      </ConfigContext.Provider>
    ));

    expect(() => serviceClient!.get("unknown")).toThrow(
      "Client key not connected: unknown",
    );
  });

  it("returns false when isConnected is called with unconnected key", () => {
    let serviceClient: ServiceClientContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <I18nProvider>
          <NotificationProvider>
            <ServiceClientProvider>
              {(() => {
                serviceClient = useServiceClient();
                return null;
              })()}
            </ServiceClientProvider>
          </NotificationProvider>
        </I18nProvider>
      </ConfigContext.Provider>
    ));

    expect(serviceClient!.isConnected("unknown")).toBe(false);
  });
});
