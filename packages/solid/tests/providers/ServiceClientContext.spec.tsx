import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { render } from "@solidjs/testing-library";
import {
  useServiceClient,
  type ServiceClientContextValue,
} from "../../src/providers/ServiceClientContext";
import { ServiceClientProvider } from "../../src/providers/ServiceClientProvider";
import { NotificationProvider } from "../../src/components/feedback/notification/NotificationProvider";
import { ConfigContext } from "../../src/providers/ConfigContext";

describe("ServiceClientContext", () => {
  describe("useServiceClient", () => {
    it("Provider 없이 사용하면 에러가 발생한다", () => {
      createRoot((dispose) => {
        expect(() => useServiceClient()).toThrow(
          "useServiceClient는 ServiceClientProvider 내부에서만 사용할 수 있습니다",
        );
        dispose();
      });
    });
  });
});

describe("ServiceClientProvider", () => {
  it("Provider 내에서 useServiceClient가 정상 동작한다", () => {
    let serviceClient: ServiceClientContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <ServiceClientProvider>
            {(() => {
              serviceClient = useServiceClient();
              return null;
            })()}
          </ServiceClientProvider>
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(serviceClient!).toBeDefined();
    expect(typeof serviceClient!.connect).toBe("function");
    expect(typeof serviceClient!.close).toBe("function");
    expect(typeof serviceClient!.get).toBe("function");
    expect(typeof serviceClient!.isConnected).toBe("function");
  });

  it("연결하지 않은 키로 get 호출 시 에러가 발생한다", () => {
    let serviceClient: ServiceClientContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <ServiceClientProvider>
            {(() => {
              serviceClient = useServiceClient();
              return null;
            })()}
          </ServiceClientProvider>
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(() => serviceClient!.get("unknown")).toThrow(
      "연결하지 않은 클라이언트 키입니다. unknown",
    );
  });

  it("연결하지 않은 키로 isConnected 호출 시 false를 반환한다", () => {
    let serviceClient: ServiceClientContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <ServiceClientProvider>
            {(() => {
              serviceClient = useServiceClient();
              return null;
            })()}
          </ServiceClientProvider>
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(serviceClient!.isConnected("unknown")).toBe(false);
  });
});
