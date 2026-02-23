import { type Accessor, type Setter, createEffect, createSignal, untrack } from "solid-js";
import { useConfig } from "../providers/ConfigContext";
import { useSyncStorage } from "../providers/SyncStorageContext";

/**
 * Creates a reactive signal that syncs configuration data to storage.
 *
 * Uses `SyncStorageProvider` storage if available, otherwise falls back to `localStorage`.
 * Designed for data that should persist and sync across devices (e.g., theme, user preferences, DataSheet configs).
 *
 * When the adapter changes via `useSyncStorage().configure()`, re-reads from the new adapter.
 *
 * @param key - Storage key for the config value
 * @param defaultValue - Default value if no stored value exists
 * @returns Tuple of [value accessor, value setter, ready state accessor]
 *
 * @example
 * ```tsx
 * const [theme, setTheme, ready] = useSyncConfig("user-theme", "light");
 *
 * <Show when={ready()}>
 *   <button onClick={() => setTheme(theme() === "light" ? "dark" : "light")}>
 *     Toggle theme
 *   </button>
 * </Show>
 * ```
 */
export function useSyncConfig<TValue>(
  key: string,
  defaultValue: TValue,
): [Accessor<TValue>, Setter<TValue>, Accessor<boolean>] {
  const config = useConfig();
  const syncStorageCtx = useSyncStorage();
  const prefixedKey = `${config.clientName}.${key}`;
  const [value, setValue] = createSignal<TValue>(defaultValue);
  const [ready, setReady] = createSignal(false);
  let writeVersion = 0;

  // Initialize from storage (reactive to adapter changes via configure())
  createEffect(() => {
    const currentAdapter = syncStorageCtx?.adapter();
    setReady(false);

    void (async () => {
      const versionBefore = writeVersion;

      if (!currentAdapter) {
        // Use localStorage synchronously
        try {
          const stored = localStorage.getItem(prefixedKey);
          if (stored !== null && writeVersion === versionBefore) {
            setValue(() => JSON.parse(stored) as TValue);
          }
        } catch {
          // Ignore parse errors, keep default value
        }
        setReady(true);
        return;
      }

      // Use custom adapter asynchronously
      try {
        const stored = await currentAdapter.getItem(prefixedKey);
        if (stored !== null && writeVersion === versionBefore) {
          setValue(() => JSON.parse(stored) as TValue);
        }
      } catch {
        // Fall back to localStorage on error
        try {
          const stored = localStorage.getItem(prefixedKey);
          if (stored !== null && writeVersion === versionBefore) {
            setValue(() => JSON.parse(stored) as TValue);
          }
        } catch {
          // Ignore parse errors
        }
      } finally {
        setReady(true);
      }
    })();
  });

  // Save to storage whenever value changes
  createEffect(() => {
    if (!ready()) return; // Don't save until storage has been read
    const currentValue = value();
    const serialized = JSON.stringify(currentValue);

    // Read adapter untracked to avoid re-running save effect when adapter changes
    const currentAdapter = untrack(() => syncStorageCtx?.adapter());

    if (!currentAdapter) {
      // Use localStorage synchronously
      localStorage.setItem(prefixedKey, serialized);
      return;
    }

    // Use custom adapter asynchronously
    void (async () => {
      try {
        await currentAdapter.setItem(prefixedKey, serialized);
      } catch {
        // Fall back to localStorage on error
        localStorage.setItem(prefixedKey, serialized);
      }
    })();
  });

  const userSetValue: Setter<TValue> = ((...args: any[]) => {
    writeVersion++;
    return (setValue as any)(...args);
  }) as Setter<TValue>;

  return [value, userSetValue, ready];
}
