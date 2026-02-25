import {
  createContext,
  useContext,
  onCleanup,
  type Accessor,
  type JSX,
  type Setter,
} from "solid-js";

export interface TopbarContextValue {
  actions: Accessor<JSX.Element | undefined>;
  setActions: Setter<JSX.Element | undefined>;
}

export const TopbarContext = createContext<TopbarContextValue>();

export function useTopbarActionsAccessor(): Accessor<JSX.Element | undefined> {
  const context = useContext(TopbarContext);
  if (!context) {
    throw new Error("useTopbarActionsAccessor can only be used inside Topbar.Container");
  }
  return context.actions;
}

export function createTopbarActions(accessor: () => JSX.Element): void {
  const context = useContext(TopbarContext);
  if (!context) {
    throw new Error("createTopbarActions can only be used inside Topbar.Container");
  }

  context.setActions(() => accessor());

  onCleanup(() => {
    context.setActions(undefined);
  });
}
