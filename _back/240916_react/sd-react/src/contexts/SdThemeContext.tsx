import { context } from "../utils/context";
import { signal } from "../utils/signal";


export type TSdTheme = "modern" | "compact" | "kiosk" | "mobile";

export const {
  SdThemeConsumer,
  SdThemeProvider,
  useSdTheme
} = context("SdTheme", () => {
  const theme$ = signal<TSdTheme>("modern");

  return class {
    theme$ = theme$;
  };
});