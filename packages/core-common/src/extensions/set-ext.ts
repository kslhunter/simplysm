/**
 * Set extension methods
 */

declare global {
  interface Set<T> {
    /**
     * Add multiple values at once
     */
    adds(...values: T[]): this;

    /**
     * Toggle value (remove if exists, add if not)
     *
     * @param value Value to toggle
     * @param addOrDel Force add ("add") or remove ("del") (if omitted, toggle automatically)
     * @returns this (method chaining available)
     *
     * @remarks
     * addOrDel parameter allows concise expression of conditional add/remove.
     *
     * @example
     * ```typescript
     * const set = new Set<number>([1, 2, 3]);
     *
     * set.toggle(2);  // 2 exists, so remove → {1, 3}
     * set.toggle(4);  // 4 doesn't exist, so add → {1, 3, 4}
     *
     * // Conditional toggle
     * const isAdmin = true;
     * set.toggle(5, isAdmin ? "add" : "del");  // Force add
     * ```
     */
    toggle(value: T, addOrDel?: "add" | "del"): this;
  }
}

Object.defineProperty(Set.prototype, "adds", {
  value: function <T>(this: Set<T>, ...values: T[]): Set<T> {
    for (const val of values) {
      this.add(val);
    }
    return this;
  },
  enumerable: false,
  writable: true,
  configurable: true,
});

Object.defineProperty(Set.prototype, "toggle", {
  value: function <T>(this: Set<T>, value: T, addOrDel?: "add" | "del"): Set<T> {
    if (addOrDel === "add") {
      this.add(value);
    } else if (addOrDel === "del") {
      this.delete(value);
    } else if (this.has(value)) {
      this.delete(value);
    } else {
      this.add(value);
    }
    return this;
  },
  enumerable: false,
  writable: true,
  configurable: true,
});

export {};
