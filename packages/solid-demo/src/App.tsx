import type { RouteSectionProps } from "@solidjs/router";
import { InitializeProvider } from "@simplysm/solid";
import { onMount } from "solid-js";

export function App(props: RouteSectionProps) {
  onMount(() => {
    document.querySelector(".app-loading")?.remove();
  });

  return <InitializeProvider config={{ clientName: "solid-demo" }}>{props.children}</InitializeProvider>;
}
