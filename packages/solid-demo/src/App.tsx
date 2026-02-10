import type { RouteSectionProps } from "@solidjs/router";
import {
  InitializeProvider,
  DialogProvider,
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
          <DialogProvider>{props.children}</DialogProvider>
        </NotificationProvider>
      </ThemeProvider>
    </InitializeProvider>
  );
}
