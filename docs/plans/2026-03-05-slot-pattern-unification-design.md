# Slot Pattern Unification Design

## Problem

The codebase uses two different patterns for non-rendering structural components:

1. **`__type` pattern** — Returns plain objects cast as `JSX.Element` with `as unknown as JSX.Element`. Parent filters children by `__type` discriminator via `isXxxDef` type guards.
2. **Context slot pattern** — Registers content into parent Context via `createSlotComponent` + `createSlotSignal`.

The `__type` pattern is a hack: it breaks type safety, requires ugly casts, and introduces unnecessary type guards. Both patterns serve the same purpose.

## Solution

Unify all structural components into a single **Context-based slot pattern** with two functions:

- `createSlot<T>()` — Single slot (errors if 2+ registered)
- `createSlots<T>()` — Multiple slots (list)

### API

```ts
// Module level
const [DataSheetColumn, useColumnSlots] = createSlots<DataSheetColumnProps>();

// Parent component
function DataSheet(props) {
  const [columns, ColumnsProvider] = useColumnSlots();
  return (
    <ColumnsProvider>
      {props.children}
      {columns().map(col => <th>{col.header}</th>)}
    </ColumnsProvider>
  );
}

// End user (unchanged)
<DataSheet>
  <DataSheetColumn key="name" header="Name">
    {(item) => item.name}
  </DataSheetColumn>
</DataSheet>
```

### How it works

1. `createSlots<T>()` returns `[SlotComponent, useSlots]`
   - `SlotComponent`: Child component that registers props into parent Context on mount, removes on cleanup
   - `useSlots()`: Hook that creates a per-instance signal + Provider. Returns `[Accessor<T[]>, Provider]`

2. `createSlot<T>()` returns `[SlotComponent, useSlot]`
   - Same as above but `useSlot()` returns `[Accessor<T | undefined>, Provider]`
   - Throws error if more than one component registers

3. Props are passed through as-is (no transform). SolidJS props are reactive proxies, so reactivity is preserved automatically.

### Internal implementation sketch

```ts
function createSlots<T>() {
  const Ctx = createContext<{ add: (item: T) => void; remove: (item: T) => void }>();

  const SlotComponent = (props: T) => {
    const ctx = useContext(Ctx)!;
    ctx.add(props);
    onCleanup(() => ctx.remove(props));
    return null;
  };

  function useSlots(): [Accessor<T[]>, ParentComponent] {
    const [items, setItems] = createSignal<T[]>([]);
    const Provider: ParentComponent = (providerProps) => (
      <Ctx.Provider value={{
        add: (item) => setItems(prev => [...prev, item]),
        remove: (item) => setItems(prev => prev.filter(i => i !== item)),
      }}>
        {providerProps.children}
      </Ctx.Provider>
    );
    return [items, Provider];
  }

  return [SlotComponent, useSlots] as const;
}
```

## Conversion targets

### `__type` pattern → slot pattern (8 components)

| Component | Current pattern | New pattern |
|-----------|----------------|-------------|
| CrudDetailTools | `createDefComponent` | `createSlot` |
| CrudDetailBefore | `createDefComponent` | `createSlot` |
| CrudDetailAfter | `createDefComponent` | `createSlot` |
| CrudSheetHeader | `createDefComponent` | `createSlot` |
| CrudSheetFilter | manual `__type` | `createSlot` |
| CrudSheetTools | manual `__type` | `createSlot` |
| DataSheetColumn | manual `__type` | `createSlots` |
| CrudSheetColumn | manual `__type` | `createSlots` |

### Existing slot consumers → new API

| Component | Current | New |
|-----------|---------|-----|
| Dialog.Header / Dialog.Action | `createSlotComponent` + `createSlotSignal` | `createSlot` |
| Dropdown.Trigger / Dropdown.Content | `createSlotComponent` + `createSlotSignal` | `createSlot` |
| Select.Header / Select.Action | `createSlotComponent` + `createSlotSignal` | `createSlot` |
| ListItem.Children | `createSlotComponent` + `createSlotSignal` | `createSlot` |
| SelectItemChildren | `createSlotComponent` + `createSlotSignal` | `createSlot` |
| NumberInput.Prefix / TextInput.Prefix | `createSlotSignal` | `createSlot` |
| Kanban title/tools | `createSlotSignal` | `createSlot` |
| SharedDataSelectList filter | `createSlotSignal` | `createSlot` |

### CrudSheet → DataSheet integration

CrudSheet registers columns directly into DataSheet's Context (no intermediate DataSheetColumn rendering). Same package, coupling acceptable.

## Files to delete

- `src/helpers/createDefComponent.ts`
- `src/helpers/createSlotComponent.ts`
- `src/hooks/createSlotSignal.ts`
- All `isXxxDef` type guard functions
- All `XxxDef` interfaces with `__type` field

## Files to create

- `src/helpers/createSlot.ts` — `createSlot<T>()` implementation
- `src/helpers/createSlots.ts` — `createSlots<T>()` implementation

## Key design decisions

1. **All slots are lists** — Single slot is a list constrained to max 1 item
2. **Props bypass** — No transform function. Props registered as-is. SolidJS proxy maintains reactivity
3. **Hook returns Provider** — Signal created in parent scope, Provider wraps children. No component splitting needed
4. **Column ordering** — Trusts SolidJS children rendering order (top → bottom)
5. **CrudSheet → DataSheet** — Direct Context registration (no intermediate component)
