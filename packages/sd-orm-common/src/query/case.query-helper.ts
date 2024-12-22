import { type TQueryValue } from "../types";
import { type Type } from "@simplysm/sd-core-common";
import { SdOrmUtils } from "../utils/sd-orm.utils";
import { QueryUnit } from "./query-unit";
import { QueryHelper } from "./query-helper";
import type { TEntityValue } from "./queryable.types";
import type { TQueryBuilderValue } from "./query-builder.types";

export class CaseQueryHelper<T extends TQueryValue> {
  private readonly _cases: any[] = [];

  public constructor(
    private readonly _qh: QueryHelper,
    private _type: Type<T> | undefined,
  ) {
  }

  public case(
    predicate: TEntityValue<boolean | Boolean> | TQueryBuilderValue,
    then: TEntityValue<T>,
  ): this {
    this._type = SdOrmUtils.getQueryValueType(then) ?? this._type;

    this._cases.push(...[
      " WHEN ",
      this._qh.getQueryValue(predicate),
      " THEN ",
      this._qh.getQueryValue(then),
    ]);
    return this;
  }

  public else(then: TEntityValue<T>): QueryUnit<T> {
    this._type = SdOrmUtils.getQueryValueType(then) ?? this._type;
    return new QueryUnit(
      this._type,
      ["CASE ", ...this._cases, " ELSE ", this._qh.getQueryValue(then), " END"],
    );
  }
}
