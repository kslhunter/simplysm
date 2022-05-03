declare interface Set<T> {
  adds(...values: T[]): this;
}

((prototype) => {
  prototype.adds = function <T>(this: Set<T>, ...values: T[]): Set<T> {
    for (const val of values) {
      this.add(val);
    }

    return this;
  };
})(Set.prototype);
