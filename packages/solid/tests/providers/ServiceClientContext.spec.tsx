import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  useServiceClient,
  type ServiceClientContextValue,
} from "../../src/providers/ServiceClientProvider";
import { ServiceClientProvider } from "../../src/providers/ServiceClientProvider";
import { NotificationProvider } from "../../src/components/feedback/notification/NotificationProvider";
import { ConfigContext } from "../../src/providers/ConfigContext";
import { I18nProvider } from "../../src/providers/i18n/I18nContext";

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
