/**
 * Map extension methods
 */

declare global {
  interface Map<K, V> {
    /**
     * If no value exists for key, set new value and return it
     *
     * @remarks
     * **Caution**: If V type is a function (e.g., `Map<string, () => void>`),
     * passing the function directly as the second argument will be recognized as a factory and called.
     * To store the function itself as a value, wrap it in a factory.
     *
     * @example
     * ```typescript
     * // Regular values
     * map.getOrCreate("key", 0);
     * map.getOrCreate("key", []);
     *
     * // Factory function (for expensive computations)
     * map.getOrCreate("key", () => expensiveComputation());
     *
     * // Storing function as value
     * const fnMap = new Map<string, () => void>();
     * const myFn = () => console.log("hello");
     * fnMap.getOrCreate("key", () => myFn);  // Wrap in factory
     * ```
     */
    getOrCreate(key: K, newValue: V): V;
    getOrCreate(key: K, newValueFn: () => V): V;

    /**
     * Update value for key using function
     *
     * @param key Key to update
     * @param updateFn Function that receives current value and returns new value (undefined if key doesn't exist)
     *
     * @remarks
     * updateFn is called even if key doesn't exist, setting new value.
     * Useful for calculations based on existing value (counter increment, add to array, etc).
     *
     * @example
     * ```typescript
     * const countMap = new Map<string, number>();
     *
     * // Increment counter
     * countMap.update("key", (v) => (v ?? 0) + 1);
     *
     * // Add item to array
     * const arrayMap = new Map<string, string[]>();
     * arrayMap.update("key", (v) => [...(v ?? []), "item"]);
     * ```
     */
    update(key: K, updateFn: (v: V | undefined) => V): void;
  }
}

Object.defineProperty(Map.prototype, "getOrCreate", {
  value: function <K, V>(this: Map<K, V>, key: K, newValue: V | (() => V)): V {
    if (!this.has(key)) {
      if (typeof newValue === "function") {
        this.set(key, (newValue as () => V)());
      } else {
        this.set(key, newValue);
      }
    }
    return this.get(key)!;
  },
  enumerable: false,
  writable: true,
  configurable: true,
});

Object.defineProperty(Map.prototype, "update", {
  value: function <K, V>(this: Map<K, V>, key: K, updateFn: (v: V | undefined) => V): void {
    const val = this.get(key);
    const res = updateFn(val);
    this.set(key, res);
  },
  enumerable: false,
  writable: true,
  configurable: true,
});

export {};
