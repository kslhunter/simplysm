import type { RouteSectionProps } from "@solidjs/router";
import { ConfigContext, ThemeProvider } from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return (
    <ConfigContext.Provider value={{ clientName: "solid-demo" }}>
      <ThemeProvider>{props.children}</ThemeProvider>
    </ConfigContext.Provider>
  );
}
