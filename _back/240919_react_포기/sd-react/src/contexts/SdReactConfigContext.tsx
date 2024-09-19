import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons";
import { context } from "../utils/context";
import { signal } from "../utils/signal";
import { useMemo, useState } from "react";

export const {
  SdReactConfigProvider,
  useSdReactConfig,
  SdReactConfigConsumer
} = context("SdReactConfig", () => {
  return useMemo(() => new class {
    clientName$ = signal("unknown");
    fallbackIcon$ = signal(faQuestionCircle);
    icons$ = signal({});
  }, []);
});