import { createContext, useContext } from "solid-js";

export interface PrintInstance {
  ready: () => void;
}

export const PrintInstanceContext = createContext<PrintInstance>();

export function usePrintInstance(): PrintInstance | undefined {
  return useContext(PrintInstanceContext);
}
