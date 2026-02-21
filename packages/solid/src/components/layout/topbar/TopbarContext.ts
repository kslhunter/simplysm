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
    throw new Error("useTopbarActionsAccessor는 Topbar.Container 내부에서만 사용할 수 있습니다");
  }
  return context.actions;
}

export function createTopbarActions(accessor: () => JSX.Element): void {
  const context = useContext(TopbarContext);
  if (!context) {
    throw new Error("createTopbarActions는 Topbar.Container 내부에서만 사용할 수 있습니다");
  }

  context.setActions(() => accessor());

  onCleanup(() => {
    context.setActions(undefined);
  });
}
