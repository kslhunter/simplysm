import {
  createContext,
  createSignal,
  onCleanup,
  type Accessor,
  type ParentComponent,
  useContext,
} from "solid-js";

export interface SlotRegistrar<TItem> {
  add: (item: TItem) => void;
  remove: (item: TItem) => void;
}

export function createSlots<TItem>() {
  const Ctx = createContext<SlotRegistrar<TItem>>();

  const SlotComponent = (props: TItem) => {
    const ctx = useContext(Ctx)!;
    ctx.add(props);
    onCleanup(() => ctx.remove(props));
    return null;
  };

  function useSlots(): [Accessor<TItem[]>, ParentComponent] {
    const [items, setItems] = createSignal<TItem[]>([]);

    const Provider: ParentComponent = (providerProps) =>
      Ctx.Provider({
        value: {
          add: (item) => setItems((prev) => [...prev, item]),
          remove: (item) => setItems((prev) => prev.filter((i) => i !== item)),
        },
        get children() {
          return providerProps.children;
        },
      });

    return [items, Provider];
  }

  return [SlotComponent, useSlots] as const;
}
