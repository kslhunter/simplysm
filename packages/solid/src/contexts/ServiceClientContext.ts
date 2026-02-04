import { createContext, useContext } from "solid-js";
import type { ServiceClient, ServiceConnectionConfig } from "@simplysm/service-client";

export interface ServiceClientContextValue {
  connect: (key: string, options?: Partial<ServiceConnectionConfig>) => Promise<void>;
  close: (key: string) => Promise<void>;
  get: (key: string) => ServiceClient;
  isConnected: (key: string) => boolean;
}

export const ServiceClientContext = createContext<ServiceClientContextValue>();

export function useServiceClient(): ServiceClientContextValue {
  const context = useContext(ServiceClientContext);
  if (!context) {
    throw new Error("useServiceClient는 ServiceClientProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
