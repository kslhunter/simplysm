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
     * 값 토글 (있으면 제거, 없으면 추가)
     *
     * @param value 토글할 값
     * @param addOrDel 강제 추가("add") 또는 제거("del") (생략 시 자동 토글)
     * @returns this (메서드 체이닝 가능)
     *
     * @remarks
     * addOrDel 매개변수로 조건부 추가/제거를 간결하게 표현할 수 있음.
     */
    toggle(value: T, addOrDel?: "add" | "del"): this;
  }
}

Object.defineProperty(Set.prototype, "adds", {
  value: function <TItem>(this: Set<TItem>, ...values: TItem[]): Set<TItem> {
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
  value: function <TItem>(this: Set<TItem>, value: TItem, addOrDel?: "add" | "del"): Set<TItem> {
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
