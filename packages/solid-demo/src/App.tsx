import type { RouteSectionProps } from "@solidjs/router";
import { SystemProvider, DialogProvider, PrintProvider } from "@simplysm/solid";
import { onMount } from "solid-js";

export function App(props: RouteSectionProps) {
  onMount(() => {
    document.querySelector(".app-busy")?.remove();
  });

  return (
    <SystemProvider clientName="solid-demo">
      <DialogProvider>
        <PrintProvider>{props.children}</PrintProvider>
      </DialogProvider>
    </SystemProvider>
  );
}
