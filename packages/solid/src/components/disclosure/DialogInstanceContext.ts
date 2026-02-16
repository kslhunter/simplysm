import { createContext, useContext } from "solid-js";

export interface DialogInstance<TResult> {
  close: (result?: TResult) => void;
}

export const DialogInstanceContext = createContext<DialogInstance<unknown>>();

export function useDialogInstance<TResult = undefined>(): DialogInstance<TResult> | undefined {
  return useContext(DialogInstanceContext) as DialogInstance<TResult> | undefined;
}
