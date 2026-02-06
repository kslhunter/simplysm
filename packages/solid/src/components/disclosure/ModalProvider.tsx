import {
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
  open: boolean;
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
      const entry: ModalEntry = {
        id,
        content: content as Component<ModalContentProps<unknown>>,
        options,
        resolve: resolve as (result: unknown) => void,
        open: true,
      };
      setEntries((prev) => [...prev, entry]);
    });
  };

  const closeEntry = (id: string, result?: unknown) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) {
        entry.resolve(result);
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
            open={entry.open}
            onOpenChange={(open) => {
              if (!open) {
                closeEntry(entry.id);
              }
            }}
            title={entry.options.title}
            hideHeader={entry.options.hideHeader}
            hideCloseButton={entry.options.hideCloseButton}
            useCloseByBackdrop={entry.options.useCloseByBackdrop}
            useCloseByEscapeKey={entry.options.useCloseByEscapeKey}
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
              close={(result?: unknown) => closeEntry(entry.id, result)}
            />
          </Modal>
        )}
      </For>
    </ModalContext.Provider>
  );
};
