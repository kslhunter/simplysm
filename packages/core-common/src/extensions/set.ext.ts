/**
 * Set 확장 메서드
 */

declare global {
  interface Set<T> {
    /**
     * 여러 값을 한 번에 추가
     */
    adds(...values: T[]): this;

    /**
     * 값을 토글 (있으면 제거, 없으면 추가)
     */
    toggle(value: T, addOrDel?: "add" | "del"): this;
  }
}

((prototype) => {
  prototype.adds = function <T>(this: Set<T>, ...values: T[]): Set<T> {
    for (const val of values) {
      this.add(val);
    }
    return this;
  };

  prototype.toggle = function <T>(
    this: Set<T>,
    value: T,
    addOrDel?: "add" | "del",
  ): Set<T> {
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
  };
})(Set.prototype);

export {};
