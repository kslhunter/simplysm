import { type ParentComponent, onCleanup } from "solid-js";
import {
  createServiceClient,
  type ServiceClient,
  type ServiceConnectionConfig,
} from "@simplysm/service-client";
import { ServiceClientContext, type ServiceClientContextValue } from "./ServiceClientContext";
import { useConfig } from "./ConfigContext";
import { useNotification } from "../components/feedback/notification/NotificationContext";

export const ServiceClientProvider: ParentComponent = (props) => {
  const config = useConfig();
  const notification = useNotification();

  const clientMap = new Map<string, ServiceClient>();
  const reqProgressMap = new Map<string, string>();
  const resProgressMap = new Map<string, string>();

  onCleanup(() => {
    for (const client of clientMap.values()) {
      void client.close();
    }
    clientMap.clear();
  });

  const connect = async (
    key: string,
    options?: Partial<ServiceConnectionConfig>,
  ): Promise<void> => {
    if (clientMap.has(key)) {
      const existing = clientMap.get(key)!;
      if (!existing.connected) {
        throw new Error("이미 연결이 끊긴 클라이언트와 같은 키로 연결을 시도하였습니다.");
      } else {
        throw new Error("이미 연결된 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
    }

    const defaultConfig: ServiceConnectionConfig = {
      host: location.hostname,
      port: Number(location.port) || (location.protocol.startsWith("https") ? 443 : 80),
      ssl: location.protocol.startsWith("https"),
    };

    const client = createServiceClient(config.clientName, {
      ...defaultConfig,
      ...options,
    });

    // 요청 진행률 이벤트
    client.on("request-progress", (state) => {
      const existing = reqProgressMap.get(state.uuid);

      if (existing == null) {
        const id = notification.info("요청을 전송하는 중입니다.", "0%");
        reqProgressMap.set(state.uuid, id);
      } else {
        const percent = Math.round((state.completedSize / state.totalSize) * 100);
        notification.update(existing, { message: `${percent}%` });
      }

      if (state.completedSize === state.totalSize) {
        const id = reqProgressMap.get(state.uuid);
        if (id != null) {
          notification.update(
            id,
            {
              title: "요청 전송 완료",
              message: "100%",
            },
            { renotify: true },
          );
          reqProgressMap.delete(state.uuid);
        }
      }
    });

    // 응답 진행률 이벤트
    client.on("response-progress", (state) => {
      const existing = resProgressMap.get(state.uuid);

      if (existing == null) {
        const id = notification.info("응답을 전송받는 중입니다.", "0%");
        resProgressMap.set(state.uuid, id);
      } else {
        const percent = Math.round((state.completedSize / state.totalSize) * 100);
        notification.update(existing, { message: `${percent}%` });
      }

      if (state.completedSize === state.totalSize) {
        const id = resProgressMap.get(state.uuid);
        if (id != null) {
          notification.update(
            id,
            {
              title: "응답 전송 완료",
              message: "100%",
            },
            { renotify: true },
          );
          resProgressMap.delete(state.uuid);
        }
      }
    });

    await client.connect();
    clientMap.set(key, client);
  };

  const close = async (key: string): Promise<void> => {
    const client = clientMap.get(key);
    if (client) {
      await client.close();
      clientMap.delete(key);
    }
  };

  const get = (key: string): ServiceClient => {
    const client = clientMap.get(key);
    if (!client) {
      throw new Error(`연결하지 않은 클라이언트 키입니다. ${key}`);
    }
    return client;
  };

  const isConnected = (key: string): boolean => {
    const client = clientMap.get(key);
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
