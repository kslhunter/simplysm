import {
  type Accessor,
  type Component,
  type ParentComponent,
  createSignal,
  For,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { ModalContext, type ModalContentProps, type ModalContextValue, type ModalShowOptions } from "./ModalContext";
import { Modal } from "./Modal";

interface ModalEntry {
  id: string;
  content: Component<ModalContentProps<unknown>>;
  options: ModalShowOptions;
  resolve: (result: unknown) => void;
  open: Accessor<boolean>;
  setOpen: (value: boolean) => void;
  pendingResult?: unknown;
}

let nextId = 0;

/**
 * 프로그래매틱 모달 Provider
 *
 * `useModal().show(content, options)` 로 모달을 열고,
 * `close(result)` 로 닫으면 Promise가 resolve됩니다.
 *
 * @example
 * ```tsx
 * <ModalProvider>
 *   <App />
 * </ModalProvider>
 * ```
 */
export const ModalProvider: ParentComponent = (props) => {
  const [entries, setEntries] = createSignal<ModalEntry[]>([]);

  const show = <T,>(
    content: Component<ModalContentProps<T>>,
    options: ModalShowOptions,
  ): Promise<T | undefined> => {
    return new Promise<T | undefined>((resolve) => {
      const id = String(nextId++);
      const [open, setOpen] = createSignal(true);
      const entry: ModalEntry = {
        id,
        content: content as Component<ModalContentProps<unknown>>,
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

  const contextValue: ModalContextValue = {
    show,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {props.children}
      <For each={entries()}>
        {(entry) => (
          <Modal
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
            <Dynamic
              component={entry.content}
              close={(result?: unknown) => requestClose(entry.id, result)}
            />
          </Modal>
        )}
      </For>
    </ModalContext.Provider>
  );
};
