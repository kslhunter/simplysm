import type { RouteSectionProps } from "@solidjs/router";
import { InitializeProvider, ModalProvider, ThemeProvider } from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return (
    <InitializeProvider config={{ clientName: "solid-demo" }}>
      <ThemeProvider>
        <ModalProvider>{props.children}</ModalProvider>
      </ThemeProvider>
    </InitializeProvider>
  );
}
