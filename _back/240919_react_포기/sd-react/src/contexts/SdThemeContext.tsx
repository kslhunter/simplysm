import { context } from "../utils/context";
import { signal } from "../utils/signal";
import { useMemo } from "react";


export type TSdTheme = "modern" | "compact" | "kiosk" | "mobile";

export const {
  SdThemeConsumer,
  SdThemeProvider,
  useSdTheme
} = context("SdTheme", () => {
  return useMemo(() => new class {
    theme$ = signal<TSdTheme>("modern");
  }, []);
});