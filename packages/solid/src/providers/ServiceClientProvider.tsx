import { createContext, type ParentComponent, onCleanup, useContext } from "solid-js";
import {
  createServiceClient,
  type ServiceClient,
  type ServiceConnectionOptions,
} from "@simplysm/service-client";
import { useConfig } from "./ConfigContext";
import { useNotification } from "../components/feedback/notification/NotificationProvider";

/**
 * WebSocket service client context value.
 */
export interface ServiceClientContextValue {
  /** Open a WebSocket connection (defaults to "default" if key is omitted) */
  connect: (key?: string, options?: Partial<ServiceConnectionOptions>) => Promise<void>;
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

/**
 * WebSocket service client Provider.
 *
 * @remarks
 * - Must be used inside ConfigProvider and NotificationProvider
 * - Key-based multi-connection management
 * - Displays request/response progress as NotificationProvider alerts
 * - Auto-infers host, port, ssl from window.location when not specified
 * - Automatically closes all connections on cleanup
 *
 * @example
 * ```tsx
 * <ConfigProvider clientName="my-app">
 *   <NotificationProvider>
 *     <ServiceClientProvider>
 *       <App />
 *     </ServiceClientProvider>
 *   </NotificationProvider>
 * </ConfigProvider>
 * ```
 */
export const ServiceClientProvider: ParentComponent = (props) => {
  const config = useConfig();
  const notification = useNotification();

  const clientMap = new Map<string, ServiceClient>();
  const reqProgressMap = new Map<string, string>();
  const resProgressMap = new Map<string, string>();

  function handleProgress(
    progressMap: Map<string, string>,
    state: { uuid: string; completedSize: number; totalSize: number },
    startTitle: string,
    completeTitle: string,
  ) {
    const existing = progressMap.get(state.uuid);

    if (existing == null) {
      const id = notification.info(startTitle, "0%");
      progressMap.set(state.uuid, id);
    } else {
      const percent = Math.round((state.completedSize / state.totalSize) * 100);
      notification.update(existing, { message: `${percent}%` });
    }

    if (state.completedSize === state.totalSize) {
      const id = progressMap.get(state.uuid);
      if (id != null) {
        notification.update(id, { title: completeTitle, message: "100%" }, { renotify: true });
        progressMap.delete(state.uuid);
      }
    }
  }

  onCleanup(() => {
    for (const client of clientMap.values()) {
      void client.close();
    }
    clientMap.clear();
  });

  const connect = async (
    key?: string,
    options?: Partial<ServiceConnectionOptions>,
  ): Promise<void> => {
    const resolvedKey = key ?? "default";

    if (clientMap.has(resolvedKey)) {
      const existing = clientMap.get(resolvedKey)!;
      if (!existing.connected) {
        throw new Error("Attempted to connect with the same key as a disconnected client.");
      } else {
        throw new Error("Attempted to connect with the same key as an already connected client.");
      }
    }

    const defaultConfig: ServiceConnectionOptions = {
      host: location.hostname,
      port: Number(location.port) || (location.protocol.startsWith("https") ? 443 : 80),
      ssl: location.protocol.startsWith("https"),
    };

    const client = createServiceClient(config.clientName, {
      ...defaultConfig,
      ...options,
    });

    client.on("request-progress", (state) => {
      handleProgress(reqProgressMap, state, "Sending request", "Request transmission completed");
    });

    client.on("response-progress", (state) => {
      handleProgress(resProgressMap, state, "Receiving response", "Response reception completed");
    });

    await client.connect();
    clientMap.set(resolvedKey, client);
  };

  const close = async (key?: string): Promise<void> => {
    const resolvedKey = key ?? "default";
    const client = clientMap.get(resolvedKey);
    if (client) {
      await client.close();
      clientMap.delete(resolvedKey);
    }
  };

  const get = (key?: string): ServiceClient => {
    const resolvedKey = key ?? "default";
    const client = clientMap.get(resolvedKey);
    if (!client) {
      throw new Error(`Client key not connected: ${resolvedKey}`);
    }
    return client;
  };

  const isConnected = (key?: string): boolean => {
    const resolvedKey = key ?? "default";
    const client = clientMap.get(resolvedKey);
    return client?.connected ?? false;
  };

  const contextValue: ServiceClientContextValue = {
    connect,
    close,
    get,
    isConnected,
  };

  return (
    <ServiceClientContext.Provider value={contextValue}>
      {props.children}
    </ServiceClientContext.Provider>
  );
};
