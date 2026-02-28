import type { RouteSectionProps } from "@solidjs/router";
import { createEventListener } from "@solid-primitives/event-listener";
import { useDialog } from "@simplysm/solid";
import { env } from "@simplysm/core-common";
import { DevDialog } from "./dev/DevDialog";

export function App(props: RouteSectionProps) {
  const dialog = useDialog();

  if (env.DEV) {
    let preservedKeys: string[] = [];

    createEventListener(document, "keydown", async (event) => {
      if (
        event.ctrlKey &&
        event.altKey &&
        event.shiftKey &&
        (event.key === "F11" || event.key === "F12")
      ) {
        event.preventDefault();
        event.stopPropagation();

        preservedKeys.push(event.key);
        preservedKeys = preservedKeys.slice(-4);

        if (
          preservedKeys[0] === "F12" &&
          preservedKeys[1] === "F11" &&
          preservedKeys[2] === "F12" &&
          preservedKeys[3] === "F12"
        ) {
          preservedKeys = [];
          await dialog.show(() => <DevDialog />, {
            header: "DEV",
          });
        }
      }
    });
  }

  return <>{props.children}</>;
}
