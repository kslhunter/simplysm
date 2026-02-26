import { type ParentComponent } from "solid-js";
import { ConfigProvider } from "./ConfigContext";
import { I18nProvider } from "./i18n/I18nContext";
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
import type { BusyVariant } from "../components/feedback/busy/BusyContext";

export type { BusyVariant };

export const SystemProvider: ParentComponent<{
  clientName: string;
  busyVariant?: BusyVariant;
}> = (props) => {
  return (
    <ConfigProvider clientName={props.clientName}>
      <I18nProvider>
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
                          <BusyProvider variant={props.busyVariant}>{props.children}</BusyProvider>
                      </SharedDataProvider>
                    </ServiceClientProvider>
                  </ThemeProvider>
                </ClipboardProvider>
              </PwaUpdateProvider>
            </ErrorLoggerProvider>
          </NotificationProvider>
        </LoggerProvider>
        </SyncStorageProvider>
      </I18nProvider>
    </ConfigProvider>
  );
};
