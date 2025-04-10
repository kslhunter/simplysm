import { DbContext } from "../db-context";
import { Type } from "@simplysm/sd-core-common";

export class StoredProcedure<D extends DbContext, T> {
  constructor(db: D, public tableType: Type<T>) {
  }
}