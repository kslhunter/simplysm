import { type ParentComponent } from "solid-js";
import { ConfigProvider } from "./ConfigContext";
import { SyncStorageProvider } from "./SyncStorageContext";
import { LoggerProvider } from "./LoggerContext";
import { NotificationProvider } from "../components/feedback/notification/NotificationProvider";
import { NotificationBanner } from "../components/feedback/notification/NotificationBanner";
import { ErrorLoggerProvider } from "./ErrorLoggerProvider";
import { PwaUpdateProvider } from "./PwaUpdateProvider";
import { ClipboardProvider } from "./ClipboardProvider";
import { ThemeProvider } from "./ThemeContext";
import { ServiceClientProvider } from "./ServiceClientProvider";
import { SharedDataProvider } from "./shared-data/SharedDataProvider";
import { BusyProvider } from "../components/feedback/busy/BusyProvider";
import { DialogProvider } from "../components/disclosure/DialogProvider";
import type { BusyVariant } from "../components/feedback/busy/BusyContext";

export type { BusyVariant };

/**
 * @simplysm/solid 메인 Provider
 *
 * @remarks
 * - 모든 개별 Provider를 올바른 의존성 순서로 네스팅
 * - `clientName`만 prop으로 전달하고, 나머지 설정은 각 hook의 `configure()`로 주입
 * - 개별 Provider를 직접 조합할 필요 없이 이 Provider 하나로 앱을 감싸면 됨
 *
 * @example
 * ```tsx
 * <InitializeProvider clientName="my-app">
 *   <AppRoot />
 * </InitializeProvider>
 *
 * function AppRoot() {
 *   const serviceClient = useServiceClient();
 *   onMount(async () => {
 *     await serviceClient.connect("main", { port: 3000 });
 *     useSyncStorage()!.configure((origin) => myStorageAdapter);
 *     useLogger().configure((origin) => myLogAdapter);
 *     useSharedData().configure((origin) => definitions);
 *   });
 * }
 * ```
 */
export const InitializeProvider: ParentComponent<{
  clientName: string;
  busyVariant?: BusyVariant;
}> = (props) => {
  return (
    <ConfigProvider clientName={props.clientName}>
      <SyncStorageProvider>
        <LoggerProvider>
          <NotificationProvider>
            <NotificationBanner />
            <ErrorLoggerProvider>
              <PwaUpdateProvider>
                <ClipboardProvider>
                  <ThemeProvider>
                    <ServiceClientProvider>
                      <SharedDataProvider>
                        <BusyProvider variant={props.busyVariant}>
                          <DialogProvider>{props.children}</DialogProvider>
                        </BusyProvider>
                      </SharedDataProvider>
                    </ServiceClientProvider>
                  </ThemeProvider>
                </ClipboardProvider>
              </PwaUpdateProvider>
            </ErrorLoggerProvider>
          </NotificationProvider>
        </LoggerProvider>
      </SyncStorageProvider>
    </ConfigProvider>
  );
};
