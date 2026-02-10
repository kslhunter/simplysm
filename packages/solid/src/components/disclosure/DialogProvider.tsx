import { type Accessor, type Component, type ParentComponent, createSignal, For, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  DialogContext,
  DialogDefaultsContext,
  type DialogContentProps,
  type DialogContextValue,
  type DialogDefaults,
  type DialogShowOptions,
} from "./DialogContext";
import { Dialog } from "./Dialog";

interface DialogEntry {
  id: string;
  content: Component<DialogContentProps<unknown>>;
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

  const show = <T,>(content: Component<DialogContentProps<T>>, options: DialogShowOptions): Promise<T | undefined> => {
    return new Promise<T | undefined>((resolve) => {
      const id = String(nextId++);
      const [open, setOpen] = createSignal(true);
      const entry: DialogEntry = {
        id,
        content: content as Component<DialogContentProps<unknown>>,
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
          {(entry) => (
            <Dialog
              open={entry.open()}
              onOpenChange={(open) => {
                if (!open) {
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
              widthPx={entry.options.widthPx}
              heightPx={entry.options.heightPx}
              minWidthPx={entry.options.minWidthPx}
              minHeightPx={entry.options.minHeightPx}
              position={entry.options.position}
              headerStyle={entry.options.headerStyle}
              canDeactivate={entry.options.canDeactivate}
            >
              <Dynamic component={entry.content} close={(result?: unknown) => requestClose(entry.id, result)} />
            </Dialog>
          )}
        </For>
      </DialogContext.Provider>
    </DialogDefaultsContext.Provider>
  );
};
