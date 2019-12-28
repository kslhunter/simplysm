import {Type} from "@simplysm/sd-core-common";
import {TEntityValueOrQueryable, TEntityValueOrQueryableArray, TQueryValue} from "../common";

export class QueryUnit<T extends TQueryValue, Q extends TEntityValueOrQueryable | TEntityValueOrQueryableArray> {
  public T?: T;

  public constructor(public readonly type: Type<T> | undefined,
                     private readonly _query: Q) {
  }

  public get query(): Q {
    return this._query;
  }
}