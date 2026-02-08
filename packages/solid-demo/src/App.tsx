import type { RouteSectionProps } from "@solidjs/router";
import { InitializeProvider, ThemeProvider } from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return (
    <InitializeProvider config={{ clientName: "solid-demo" }}>
      <ThemeProvider>{props.children}</ThemeProvider>
    </InitializeProvider>
  );
}
