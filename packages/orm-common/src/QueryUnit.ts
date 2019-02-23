import {Type} from "@simplysm/common";
import {QueriedBoolean, QueryType} from "./commons";

export class QueryUnit<T extends QueryType> {
  public constructor(public readonly type: Type<T>, private readonly _query: string) {
  }

  public get queryForWhere(): string {
    return this._query;
  }

  public get query(): string {
    if (this.type === QueriedBoolean) {
      return `CONVERT(BIT, CASE WHEN ${this._query} THEN 1 ELSE 0 END)`;
    }
    else {
      return this._query;
    }
  }
}
