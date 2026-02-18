import {
  type Accessor,
  type ParentComponent,
  createSignal,
  For,
  splitProps,
  type JSX,
} from "solid-js";
import {
  DialogContext,
  DialogDefaultsContext,
  type DialogContextValue,
  type DialogDefaults,
  type DialogShowOptions,
} from "./DialogContext";
import { DialogInstanceContext, type DialogInstance } from "./DialogInstanceContext";
import { Dialog } from "./Dialog";

interface DialogEntry {
  id: string;
  factory: () => JSX.Element;
  options: DialogShowOptions;
  resolve: (result: unknown) => void;
  open: Accessor<boolean>;
  setOpen: (value: boolean) => void;
  pendingResult?: unknown;
}

let nextId = 0;

/**
 * 프로그래매틱 다이얼로그 Provider
 *
 * `useDialog().show(content, options)` 로 다이얼로그를 열고,
 * `close(result)` 로 닫으면 Promise가 resolve됩니다.
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

  const show = <T,>(
    factory: () => JSX.Element,
    options: DialogShowOptions,
  ): Promise<T | undefined> => {
    return new Promise<T | undefined>((resolve) => {
      const id = String(nextId++);
      const [open, setOpen] = createSignal(true);
      const entry: DialogEntry = {
        id,
        factory,
        options,
        resolve: resolve as (result: unknown) => void,
        open,
        setOpen,
      };
      setEntries((prev) => [...prev, entry]);
    });
  };

  // 닫기 애니메이션 시작 (open을 false로 변경)
  const requestClose = (id: string, result?: unknown) => {
    const entry = entries().find((e) => e.id === id);
    if (entry) {
      entry.pendingResult = result;
      entry.setOpen(false);
    }
  };

  // 애니메이션 완료 후 실제 제거
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
          {(entry) => {
            const instance: DialogInstance<unknown> = {
              close: (result?: unknown) => requestClose(entry.id, result),
            };

            return (
              <Dialog
                open={entry.open()}
                onOpenChange={(open) => {
                  if (!open && entry.pendingResult === undefined) {
                    requestClose(entry.id);
                  }
                }}
                onCloseComplete={() => removeEntry(entry.id)}
                title={entry.options.title}
                hideHeader={entry.options.hideHeader}
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
                <DialogInstanceContext.Provider value={instance}>
                  {entry.factory()}
                </DialogInstanceContext.Provider>
              </Dialog>
            );
          }}
        </For>
      </DialogContext.Provider>
    </DialogDefaultsContext.Provider>
  );
};
