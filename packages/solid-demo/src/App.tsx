import type { RouteSectionProps } from "@solidjs/router";
import { InitializeProvider } from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return <InitializeProvider config={{ clientName: "solid-demo" }}>{props.children}</InitializeProvider>;
}
