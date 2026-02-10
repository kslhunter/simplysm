import { createSignal, onCleanup } from "solid-js";
import { useConfig } from "../contexts/ConfigContext";
function useLocalStorage(key, defaultValue, options) {
  const { clientName } = useConfig();
  const storageKey = `${clientName}:${key}`;
  const getValidatedValue = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored == null || stored === "") {
        return defaultValue;
      }
      if (options == null ? void 0 : options.validator) {
        return options.validator(stored) ? stored : defaultValue;
      }
      return stored;
    } catch {
      return defaultValue;
    }
  };
  const [value, setValue] = createSignal(getValidatedValue());
  const setAndPersist = (v) => {
    const next = typeof v === "function" ? v(value()) : v;
    setValue(() => next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {}
    return next;
  };
  const handleStorageChange = (e) => {
    if (e.key !== storageKey) return;
    if (e.newValue == null) {
      setValue(() => defaultValue);
    } else if (!(options == null ? void 0 : options.validator) || options.validator(e.newValue)) {
      setValue(() => e.newValue);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageChange);
    onCleanup(() => window.removeEventListener("storage", handleStorageChange));
  }
  return [value, setAndPersist];
}
export { useLocalStorage };
//# sourceMappingURL=useLocalStorage.js.map
