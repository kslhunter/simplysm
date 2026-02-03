import type { RouteSectionProps } from "@solidjs/router";
import { ConfigContext } from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return (
    <ConfigContext.Provider value={{ clientName: "solid-demo" }}>
      {props.children}
    </ConfigContext.Provider>
  );
}
