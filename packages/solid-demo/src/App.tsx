import type { RouteSectionProps } from "@solidjs/router";
import { InitializeProvider } from "@simplysm/solid";
import { onMount } from "solid-js";

export function App(props: RouteSectionProps) {
  onMount(() => {
    document.querySelector(".app-busy")?.remove();
  });

  return <InitializeProvider clientName="solid-demo">{props.children}</InitializeProvider>;
}
