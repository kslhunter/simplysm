import type { RouteSectionProps } from "@solidjs/router";
import {
  BusyProvider,
  ClipboardProvider,
  ConfigProvider,
  ErrorLoggerProvider,
  NotificationBanner,
  NotificationProvider,
  PwaUpdateProvider,
  ThemeProvider,
} from "@simplysm/solid";
import { onMount } from "solid-js";

export function App(props: RouteSectionProps) {
  onMount(() => {
    document.querySelector(".app-busy")?.remove();
  });

  return (
    <ConfigProvider clientName="solid-demo">
      <NotificationProvider>
        <NotificationBanner />
        <ErrorLoggerProvider>
          <PwaUpdateProvider>
            <ClipboardProvider>
              <ThemeProvider>
                <BusyProvider>{props.children}</BusyProvider>
              </ThemeProvider>
            </ClipboardProvider>
          </PwaUpdateProvider>
        </ErrorLoggerProvider>
      </NotificationProvider>
    </ConfigProvider>
  );
}
