import type { RouteSectionProps } from "@solidjs/router";
import {
  InitializeProvider,
  ModalProvider,
  NotificationBanner,
  NotificationProvider,
  ThemeProvider,
} from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return (
    <InitializeProvider config={{ clientName: "solid-demo" }}>
      <ThemeProvider>
        <NotificationProvider>
          <NotificationBanner />
          <ModalProvider>{props.children}</ModalProvider>
        </NotificationProvider>
      </ThemeProvider>
    </InitializeProvider>
  );
}
