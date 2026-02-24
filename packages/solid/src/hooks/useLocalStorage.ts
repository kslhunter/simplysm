import { type Accessor, createSignal } from "solid-js";
import { useConfig } from "../providers/ConfigContext";

type StorageSetter<TValue> = (
  value: TValue | undefined | ((prev: TValue | undefined) => TValue | undefined),
) => TValue | undefined;

/**
 * localStorage-based storage hook.
 * Always uses localStorage regardless of syncStorage settings.
 * Used for data that should be maintained independently per device (auth tokens, device-specific state, etc.).
 *
 * Keys are automatically prefixed with ConfigContext's `clientName`. (`${clientName}.${key}`)
 *
 * @template T - Type of the value to store
 * @param key - localStorage key
 * @param initialValue - Initial value (optional)
 * @returns [Accessor<T | undefined>, StorageSetter<T>] tuple
 *
 * @example
 * ```tsx
 * const [token, setToken] = useLocalStorage<string>("auth-token");
 *
 * // Set value
 * setToken("abc123");
 *
 * // Read value
 * console.log(token()); // "abc123"
 *
 * // Remove value
 * setToken(undefined);
 * ```
 */
export function useLocalStorage<TValue>(
  key: string,
  initialValue?: TValue,
): [Accessor<TValue | undefined>, StorageSetter<TValue>] {
  const config = useConfig();
  const prefixedKey = `${config.clientName}.${key}`;

  // Read initial value from localStorage
  let storedValue: TValue | undefined = initialValue;
  try {
    const item = localStorage.getItem(prefixedKey);
    if (item !== null) {
      storedValue = JSON.parse(item) as TValue;
    }
  } catch {
    // Use initial value on JSON parse failure
  }

  const [value, setValue] = createSignal<TValue | undefined>(storedValue);

  const setAndStore = (
    newValue: TValue | undefined | ((prev: TValue | undefined) => TValue | undefined),
  ) => {
    let resolved: TValue | undefined;

    if (typeof newValue === "function") {
      resolved = (newValue as (prev: TValue | undefined) => TValue | undefined)(value());
      setValue(() => resolved);
    } else {
      resolved = newValue;
      setValue(() => newValue);
    }

    if (resolved === undefined) {
      localStorage.removeItem(prefixedKey);
    } else {
      localStorage.setItem(prefixedKey, JSON.stringify(resolved));
    }

    return resolved;
  };

  return [value, setAndStore];
}
