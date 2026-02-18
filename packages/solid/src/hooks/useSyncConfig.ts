import { type Accessor, type Setter, createEffect, createSignal, onCleanup } from "solid-js";
import { useConfig } from "../providers/ConfigContext";

/**
 * Creates a reactive signal that syncs configuration data to storage.
 *
 * Uses `syncStorage` from ConfigProvider if available, otherwise falls back to `localStorage`.
 * Designed for data that should persist and sync across devices (e.g., theme, user preferences, DataSheet configs).
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
  const prefixedKey = `${config.clientName}.${key}`;
  const [value, setValue] = createSignal<TValue>(defaultValue);
  const [ready, setReady] = createSignal(false);

  // Initialize from storage
  const initializeFromStorage = async () => {
    if (!config.syncStorage) {
      // Use localStorage synchronously
      try {
        const stored = localStorage.getItem(prefixedKey);
        if (stored !== null) {
          setValue(() => JSON.parse(stored) as TValue);
        }
      } catch {
        // Ignore parse errors, keep default value
      }
      setReady(true);
      return;
    }

    // Use syncStorage asynchronously
    try {
      const stored = await config.syncStorage.getItem(prefixedKey);
      if (stored !== null) {
        setValue(() => JSON.parse(stored) as TValue);
      }
    } catch {
      // Fall back to localStorage on error
      try {
        const stored = localStorage.getItem(prefixedKey);
        if (stored !== null) {
          setValue(() => JSON.parse(stored) as TValue);
        }
      } catch {
        // Ignore parse errors
      }
    } finally {
      setReady(true);
    }
  };

  // Initialize on mount
  void initializeFromStorage();

  // Save to storage whenever value changes
  createEffect(() => {
    const currentValue = value();
    const serialized = JSON.stringify(currentValue);

    if (!config.syncStorage) {
      // Use localStorage synchronously
      localStorage.setItem(prefixedKey, serialized);
      return;
    }

    // Use syncStorage asynchronously
    void (async () => {
      try {
        await config.syncStorage!.setItem(prefixedKey, serialized);
      } catch {
        // Fall back to localStorage on error
        localStorage.setItem(prefixedKey, serialized);
      }
    })();
  });

  // Clean up (optional, for consistency)
  onCleanup(() => {
    // No cleanup needed for storage operations
  });

  return [value, setValue, ready];
}
