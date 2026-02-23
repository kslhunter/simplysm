# Core Signal Utilities

All signal utilities are direct re-exports from Angular's signals system with additional functionality.

## $signal

Enhanced `WritableSignal` factory. Adds a `$mark()` method for triggering reactivity on mutated objects without reassignment.

```typescript
import { $signal } from "@simplysm/sd-angular";

const count = $signal(0);
const items = $signal<string[]>([]);
const optional = $signal<number>(); // SdWritableSignal<number | undefined>

// Force change detection without reassigning
items().push("new item");
items.$mark();
```

**Signatures:**

```typescript
function $signal<T>(): SdWritableSignal<T | undefined>;
function $signal<T>(initialValue: T): SdWritableSignal<T>;
```

**Interface `SdWritableSignal<T>`** extends `WritableSignal<T>`:

- `$mark(): void` — triggers reactivity without value change

**Helper:** `toSignal<T>(sig: WritableSignal<T>): SdWritableSignal<T>` — upgrades an existing `WritableSignal` to `SdWritableSignal`.

---

## $computed

Extended `computed()` that also supports async computations with explicit dependency signals.

```typescript
import { $computed } from "@simplysm/sd-angular";

// Synchronous (same as Angular computed())
const doubled = $computed(() => count() * 2);

// Async with explicit dependency tracking
const userList = $computed(
  [userId], // tracked signals
  async () => await fetchUsers(userId()), // runs in untracked context
);

// Async with initial value
const data = $computed([userId], async () => await fetch(userId()), { initialValue: [] });
```

**Overloads:**

```typescript
function $computed<R>(fn: () => R): Signal<R>;
function $computed<R>(signals: Signal<any>[], fn: () => R): Signal<R>;
function $computed<R>(signals: Signal<any>[], fn: () => Promise<R>): Signal<R | undefined>;
function $computed<R>(
  signals: Signal<any>[],
  fn: () => Promise<R>,
  opt: { initialValue: R },
): Signal<R>;
```

---

## $effect

Extended `effect()` that supports async functions with explicit dependency signals for controlled reactivity.

```typescript
import { $effect } from "@simplysm/sd-angular";

// Standard effect (same as Angular effect())
$effect((onCleanup) => {
  const sub = someObservable.subscribe();
  onCleanup(() => sub.unsubscribe());
});

// Async with explicit dependency signals
$effect([userId, filter], async (onCleanup) => {
  const data = await fetchData(userId(), filter());
  items.set(data);
});
```

**Overloads:**

```typescript
function $effect(fn: (onCleanup: EffectCleanupRegisterFn) => void, options?): EffectRef;
function $effect(
  conditions: (() => unknown)[],
  fn: (onCleanup) => void | Promise<void>,
  options?,
): EffectRef;
```

---

## $afterRenderEffect

Like `$effect` but runs after the Angular render cycle. Useful for DOM measurements.

```typescript
import { $afterRenderEffect } from "@simplysm/sd-angular";

$afterRenderEffect((onCleanup) => {
  const el = elRef.nativeElement;
  // Safe to measure DOM here
});

// With explicit signals
$afterRenderEffect([width, height], (onCleanup) => {
  updateLayout(width(), height());
});
```

**Overloads:**

```typescript
function $afterRenderEffect(fn: (onCleanup) => void): EffectRef;
function $afterRenderEffect(
  signals: Signal<any>[],
  fn: (onCleanup) => void | Promise<void>,
): EffectRef;
```

---

## $afterRenderComputed

Creates a signal updated after each render cycle.

```typescript
import { $afterRenderComputed } from "@simplysm/sd-angular";

const elWidth = $afterRenderComputed(() => elRef.nativeElement.getBoundingClientRect().width, {
  initialValue: 0,
});
```

**Overloads:**

```typescript
function $afterRenderComputed<R>(fn: () => R, opt: { initialValue: R }): Signal<R>;
function $afterRenderComputed<R>(fn: () => R, opt?: { initialValue?: R }): Signal<R | undefined>;
```

---

## $resource

Extended `resource()` from Angular with an optional `saver` callback that runs when the resource value changes locally (status = `"local"`).

```typescript
import { $resource } from "@simplysm/sd-angular";

const configResource = $resource({
  params: () => ({ key: configKey() }),
  loader: async ({ params }) => await loadConfig(params.key),
  saver: async (value) => {
    await saveConfig(value);
  },
  defaultValue: {},
});
```

**Overloads:**

```typescript
function $resource<T, R>(
  options: ResourceOptions<T, R> & { saver?; defaultValue: T },
): ResourceRef<T>;
function $resource<T, R>(options: ResourceOptions<T, R> & { saver? }): ResourceRef<T | undefined>;
```

---

## $mark

Forcibly notifies Angular signal consumers that a signal value has changed, without actually calling `.set()` or `.update()`. Useful for signaling mutations to arrays/objects in place.

```typescript
import { $mark } from "@simplysm/sd-angular";

const items = signal<string[]>([]);
items().push("item");
$mark(items); // trigger reactivity
$mark(items, true); // trigger + shallow clone
```

**Signature:**

```typescript
function $mark(sig: WritableSignal<any>, clone?: boolean): void;
```

---

## $arr

Provides mutation helpers for `Signal<T[]>` that return new array references to trigger reactivity. Also supports snapshot/diff tracking.

```typescript
import { $arr } from "@simplysm/sd-angular";

const items = $signal<{ id: number; name: string }[]>([]);

// Mutations
$arr(items).insert(0, { id: 1, name: "A" });
$arr(items).remove((item) => item.id === 1);
$arr(items).toggle({ id: 2, name: "B" });

// Snapshot & diff
$arr(items).snapshot("id");
// ... user makes edits ...
const changed = $arr(items).changed(items()[0]);
const diffs = $arr(items).diffs({ excludes: ["lastModifiedAt"] });
const original = $arr(items).origin; // Map<any, T>
```

**Methods:**

| Method                      | Description                              |
| --------------------------- | ---------------------------------------- |
| `insert(i, item)`           | Insert item at index                     |
| `remove(itemOrFn)`          | Remove item or items matching predicate  |
| `toggle(value)`             | Add if absent, remove if present         |
| `snapshot(keyPropNameOrFn)` | Save current state for diff tracking     |
| `changed(item)`             | Check if item has changed since snapshot |
| `diffs(options?)`           | Get array of change records              |
| `origin`                    | `Map<any, T>` — snapshot as a map        |

---

## $obj

Provides snapshot/diff tracking and field mutation helpers for object signals.

```typescript
import { $obj } from "@simplysm/sd-angular";

const form = $signal({ name: "", age: 0 });

$obj(form).snapshot();
$obj(form).updateField("name", "Alice");

if ($obj(form).changed()) {
  console.log("Modified from:", $obj(form).origin);
}
```

**Methods:**

| Method                  | Description                         |
| ----------------------- | ----------------------------------- |
| `snapshot()`            | Save current state                  |
| `changed()`             | Whether value differs from snapshot |
| `origin`                | Original snapshotted value          |
| `updateField(key, val)` | Update a single field immutably     |
| `deleteField(key)`      | Delete a field immutably            |

---

## $map

Mutation helpers for `WritableSignal<Map<K, T>>`.

```typescript
import { $map } from "@simplysm/sd-angular";

const cache = $signal(new Map<string, number>());
$map(cache).set("key", 42);
$map(cache).update("key", (v) => (v ?? 0) + 1);
```

**Methods:** `set(key, value)`, `update(key, fn)`

---

## $set

Mutation helpers for `WritableSignal<Set<T>>`.

```typescript
import { $set } from "@simplysm/sd-angular";

const selected = $signal(new Set<number>());
$set(selected).add(1);
$set(selected).toggle(2);
$set(selected).deletes(1, 2, 3);
```

**Methods:** `add(value)`, `adds(...values)`, `delete(value)`, `deletes(...values)`, `toggle(value, addOrDel?: "add" | "del")`
