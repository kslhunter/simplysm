declare interface Set<T> {
  adds(...values: T[]): this;
  toggle(value: T, addOrDel?: "add" | "del"): this;
}

((prototype) => {
  prototype.adds = function <T>(this: Set<T>, ...values: T[]): Set<T> {
    for (const val of values) {
      this.add(val);
    }

    return this;
  };

  prototype.toggle = function <T>(this: Set<T>, value: T, addOrDel?: "add" | "del"): Set<T> {
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
