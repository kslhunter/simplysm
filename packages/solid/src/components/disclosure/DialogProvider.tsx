import {
  type Accessor,
  type Component,
  type ParentComponent,
  createSignal,
  For,
  Show,
  splitProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  DialogContext,
  DialogDefaultsContext,
  type DialogContextValue,
  type DialogDefaults,
  type DialogShowOptions,
} from "./DialogContext";
import { Dialog } from "./Dialog";

interface DialogEntry {
  id: string;
  component: Component<any>;
  props: Record<string, any>;
  options: DialogShowOptions;
  resolve: (result: unknown) => void;
  open: Accessor<boolean>;
  setOpen: (value: boolean) => void;
  pendingResult?: unknown;
}

let nextId = 0;

/**
 * Programmatic dialog Provider
 *
 * Open dialogs with `useDialog().show(component, props, options)`,
 * and close them with `props.close(result)` to resolve the Promise.
 *
 * @example
 * ```tsx
 * <DialogProvider>
 *   <App />
 * </DialogProvider>
 * ```
 */
export interface DialogProviderProps extends DialogDefaults {}

export const DialogProvider: ParentComponent<DialogProviderProps> = (props) => {
  const [local, _rest] = splitProps(props, ["closeOnEscape", "closeOnBackdrop", "children"]);

  const defaults = () => ({
    closeOnEscape: local.closeOnEscape,
    closeOnBackdrop: local.closeOnBackdrop,
  });

  const [entries, setEntries] = createSignal<DialogEntry[]>([]);

  const show = <P extends Record<string, any>,>(
    component: Component<P>,
    componentProps: Record<string, any>,
    options?: DialogShowOptions,
  ): Promise<any> => {
    return new Promise((resolve) => {
      const id = String(nextId++);
      const [open, setOpen] = createSignal(true);
      const entry: DialogEntry = {
        id,
        component,
        props: componentProps,
        options: options ?? {},
        resolve,
        open,
        setOpen,
      };
      setEntries((prev) => [...prev, entry]);
    });
  };

  // Start close animation (set open to false)
  const requestClose = (id: string, result?: unknown) => {
    const entry = entries().find((e) => e.id === id);
    if (entry) {
      entry.pendingResult = result;
      entry.setOpen(false);
    }
  };

  // Actually remove after animation completes
  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) {
        entry.resolve(entry.pendingResult);
      }
      return prev.filter((e) => e.id !== id);
    });
  };

  const contextValue: DialogContextValue = {
    show,
  };

  return (
    <DialogDefaultsContext.Provider value={defaults}>
      <DialogContext.Provider value={contextValue}>
        {local.children}
        <For each={entries()}>
          {(entry) => (
            <Dialog
              open={entry.open()}
              onOpenChange={(open) => {
                if (!open && entry.pendingResult === undefined) {
                  requestClose(entry.id);
                }
              }}
              onCloseComplete={() => removeEntry(entry.id)}
              closable={entry.options.closable}
              closeOnBackdrop={entry.options.closeOnBackdrop}
              closeOnEscape={entry.options.closeOnEscape}
              resizable={entry.options.resizable}
              movable={entry.options.movable}
              float={entry.options.float}
              fill={entry.options.fill}
              width={entry.options.width}
              height={entry.options.height}
              minWidth={entry.options.minWidth}
              minHeight={entry.options.minHeight}
              position={entry.options.position}
              headerStyle={entry.options.headerStyle}
              canDeactivate={entry.options.canDeactivate}
            >
              <Show when={entry.options.header !== undefined}>
                <Dialog.Header>{entry.options.header}</Dialog.Header>
              </Show>
              <Dynamic
                component={entry.component}
                {...entry.props}
                close={(result?: unknown) => requestClose(entry.id, result)}
              />
            </Dialog>
          )}
        </For>
      </DialogContext.Provider>
    </DialogDefaultsContext.Provider>
  );
};
