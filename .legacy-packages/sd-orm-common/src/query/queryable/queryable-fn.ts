import type { Type } from "@simplysm/sd-core-common";
import type { DbContext } from "../../DbContext";
import { Queryable } from "./Queryable";

export function queryable<D extends DbContext, T>(db: D, type: Type<T>): Queryable<D, T> {
  let cached: Queryable<D, T> | undefined;

  const ensureInit = () => {
    cached ??= new Queryable(db, type);
    return cached;
  };

  return new Proxy({} as Queryable<D, T>, {
    get(_, prop) {
      return (ensureInit() as any)[prop];
    },
    getPrototypeOf() {
      return Queryable.prototype;  // instanceof 체크 통과용
    },
  });
}
