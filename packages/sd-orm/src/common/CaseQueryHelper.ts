import { TEntityValue, TQueryBuilderValue, TQueryValue } from "./commons";
import { Type } from "@simplysm/sd-core/common";
import { SdOrmUtil } from "./utils/SdOrmUtil";
import { QueryUnit } from "./QueryUnit";
import { QueryHelper } from "./QueryHelper";

export class CaseQueryHelper<T extends TQueryValue> {
  private readonly _cases: any[] = [];

  public constructor(private readonly _qh: QueryHelper,
                     private _type: Type<T> | undefined) {
  }

  public case(predicate: TEntityValue<boolean | Boolean> | TQueryBuilderValue, then: TEntityValue<T>): this {
    this._type = SdOrmUtil.getQueryValueType(then) ?? this._type;

    this._cases.push(...[" WHEN ", this._qh.getQueryValue(predicate), " THEN ", this._qh.getQueryValue(then)]);
    return this;
  }

  public else(then: TEntityValue<T>): QueryUnit<T> {
    this._type = SdOrmUtil.getQueryValueType(then) ?? this._type;
    return new QueryUnit(this._type, ["CASE ", ...this._cases, " ELSE ", this._qh.getQueryValue(then), " END"]);
  }
}
