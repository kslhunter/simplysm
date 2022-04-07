import { ObjectUtil } from "../utils/ObjectUtil";

export class ObjectSet<T> extends Set<T> {
  public override add(value: T): this {
    if (this.has(value)) {
      return this;
    }
    return super.add(value);
  }

  public override has(value: T): boolean {
    for (const item of this) {
      if (value === item || ObjectUtil.equal(value, item)) {
        return true;
      }
    }
    return false;
  }
}
