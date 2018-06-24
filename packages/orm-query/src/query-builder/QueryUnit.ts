import {Type} from "@simplism/core";
import {QueriedBoolean, QueryType} from "../common/types";

export class QueryUnit<T extends QueryType> {
  public constructor(public readonly type: Type<T>, private readonly _query: string) {
  }

  public get queryForWhere(): string {
    return this._query;
  }

  public get query(): string {
    if (this.type === QueriedBoolean) {
      throw new Error("미구현");
    }
    else {
      return this._query;
    }
  }
}