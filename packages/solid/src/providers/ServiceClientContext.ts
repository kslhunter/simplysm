import { createContext, useContext } from "solid-js";
import type { ServiceClient, ServiceConnectionConfig } from "@simplysm/service-client";

/**
 * WebSocket 서비스 클라이언트 Context 값
 */
export interface ServiceClientContextValue {
  /** WebSocket 연결 열기 (key 생략 시 "default") */
  connect: (key?: string, options?: Partial<ServiceConnectionConfig>) => Promise<void>;
  /** 연결 닫기 */
  close: (key?: string) => Promise<void>;
  /** 연결된 클라이언트 인스턴스 가져오기 (연결되지 않은 key면 에러 발생) */
  get: (key?: string) => ServiceClient;
  /** 연결 상태 확인 */
  isConnected: (key?: string) => boolean;
}

/** WebSocket 서비스 클라이언트 Context */
export const ServiceClientContext = createContext<ServiceClientContextValue>();

/**
 * WebSocket 서비스 클라이언트에 접근하는 훅
 *
 * @throws ServiceClientProvider가 없으면 에러 발생
 */
export function useServiceClient(): ServiceClientContextValue {
  const context = useContext(ServiceClientContext);
  if (!context) {
    throw new Error("useServiceClient는 ServiceClientProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
