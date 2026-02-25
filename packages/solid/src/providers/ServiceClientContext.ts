import { createContext, useContext } from "solid-js";
import type { ServiceClient, ServiceConnectionConfig } from "@simplysm/service-client";

/**
 * WebSocket service client context value.
 */
export interface ServiceClientContextValue {
  /** Open a WebSocket connection (defaults to "default" if key is omitted) */
  connect: (key?: string, options?: Partial<ServiceConnectionConfig>) => Promise<void>;
  /** Close a connection */
  close: (key?: string) => Promise<void>;
  /** Get a connected client instance (throws if the key is not connected) */
  get: (key?: string) => ServiceClient;
  /** Check connection status */
  isConnected: (key?: string) => boolean;
}

/** WebSocket service client Context */
export const ServiceClientContext = createContext<ServiceClientContextValue>();

/**
 * Hook to access the WebSocket service client.
 *
 * @throws Throws an error if ServiceClientProvider is not present
 */
export function useServiceClient(): ServiceClientContextValue {
  const context = useContext(ServiceClientContext);
  if (!context) {
    throw new Error("useServiceClient can only be used inside ServiceClientProvider");
  }
  return context;
}
