import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons";
import { context } from "../utils/context";
import { signal } from "../utils/signal";

export const {
  SdReactConfigProvider,
  useSdReactConfig,
  SdReactConfigConsumer
} = context("SdReactConfig", () => {
  const clientName$ = signal("unknown");
  const fallbackIcon$ = signal(faQuestionCircle);
  const icons$ = signal<{}>({});

  return class {
    clientName$ = clientName$;
    fallbackIcon$ = fallbackIcon$;
    icons$ = icons$;
  };
});