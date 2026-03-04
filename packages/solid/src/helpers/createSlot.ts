import {
  createContext,
  createSignal,
  onCleanup,
  untrack,
  type Accessor,
  type ParentComponent,
  useContext,
} from "solid-js";

export function createSlot<TItem>() {
  const Ctx = createContext<{ add: (item: TItem) => void; remove: () => void }>();

  const SlotComponent = (props: TItem) => {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("SlotComponent must be rendered inside its Provider");
    ctx.add(props);
    onCleanup(() => ctx.remove());
    return null;
  };

  function createSlotAccessor(): [Accessor<TItem | undefined>, ParentComponent] {
    const [item, setItem] = createSignal<TItem | undefined>();

    const Provider: ParentComponent = (providerProps) =>
      Ctx.Provider({
        value: {
          add: (newItem) => {
            if (untrack(item) !== undefined) {
              throw new Error("Slot already occupied");
            }
            setItem(() => newItem);
          },
          remove: () => setItem(undefined),
        },
        get children() {
          return providerProps.children;
        },
      });

    return [item, Provider];
  }

  return [SlotComponent, createSlotAccessor] as const;
}
