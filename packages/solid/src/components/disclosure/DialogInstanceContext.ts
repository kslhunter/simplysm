import { createContext, useContext } from "solid-js";

/**
 * Dialog instance (used internally within programmatic dialogs)
 */
export interface DialogInstance<TResult> {
  /** Close dialog (result is passed to show() Promise) */
  close: (result?: TResult) => void;
}

/** Dialog instance Context */
export const DialogInstanceContext = createContext<DialogInstance<unknown>>();

/**
 * Hook to access dialog instance
 *
 * @remarks
 * Only has a value inside a dialog opened via DialogProvider.show().
 * Returns undefined when called outside the Provider.
 *
 * @returns DialogInstance or undefined (outside Provider)
 */
export function useDialogInstance<TResult = undefined>(): DialogInstance<TResult> | undefined {
  return useContext(DialogInstanceContext) as DialogInstance<TResult> | undefined;
}
