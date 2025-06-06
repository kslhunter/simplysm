import {ObjectUtils} from "../utils/object.utils";

export class ObjectSet<T> extends Set<T> {
  override add(value: T): this {
    if (this.has(value)) {
      return this;
    }
    return super.add(value);
  }

  override has(value: T): boolean {
    for (const item of this) {
      if (value === item || ObjectUtils.equal(value, item)) {
        return true;
      }
    }
    return false;
  }
}
