import {Type} from "@simplism/sd-core";
import {QueryHelper} from "../common/QueryHelper";
import {QueriedBoolean, QueryUnit} from "./Queryable";

export class CaseQueryMaker<T> {
  private _query = "CASE ";

  public constructor(private readonly _type: Type<T> | undefined) {
  }

  public case(when: boolean | QueryUnit<boolean> | QueryUnit<QueriedBoolean>, then: QueryUnit<T> | T | undefined): CaseQueryMaker<T> {
    this._query += `WHEN ${this._getQuery(when, false)} THEN ${this._getQuery(then)} `;
    return this as any;
  }

  public else(elseResult: QueryUnit<T> | T | undefined): T {
    this._query += `ELSE ${this._getQuery(elseResult)} END`;
    return new QueryUnit(this._type, this._query) as any;
  }

  private _getQuery<P>(param: QueryUnit<P> | P | undefined, shouldCastQueriedBoolean: boolean = true): string {
    return param !== undefined
      ? param instanceof QueryUnit
        ? (shouldCastQueriedBoolean && param.type && (param.type.name === "QueriedBoolean"))
          ? `CASE WHEN (${param.query}) THEN 1 ELSE 0 END`
          : param.query
        : this._value(param)
      : "NULL";
  }

  private _value(value: any): string {
    if (value instanceof QueryUnit) {
      return value.query;
    }
    else {
      return QueryHelper.escape(value);
    }
  }
}
