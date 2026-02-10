import { createContext, useContext } from "solid-js";

export interface DialogInstance<T> {
  close: (result?: T) => void;
}

export const DialogInstanceContext = createContext<DialogInstance<unknown>>();

export function useDialogInstance<T = undefined>(): DialogInstance<T> | undefined {
  return useContext(DialogInstanceContext) as DialogInstance<T> | undefined;
}
