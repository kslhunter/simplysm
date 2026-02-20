import { createContext, useContext } from "solid-js";
import type { JSX } from "solid-js";

export interface PrintOptions {
  size?: string;
  margin?: string;
}

export interface PrintContextValue {
  toPrinter: (factory: () => JSX.Element, options?: PrintOptions) => Promise<void>;
  toPdf: (factory: () => JSX.Element, options?: PrintOptions) => Promise<Uint8Array>;
}

export const PrintContext = createContext<PrintContextValue>();

export function usePrint(): PrintContextValue {
  const ctx = useContext(PrintContext);
  if (!ctx) throw new Error("usePrint must be used inside <PrintProvider>");
  return ctx;
}
