import { TQueryValue } from "../../types";
import { Type } from "@simplysm/sd-core-common";
import { SdOrmUtils } from "../../utils/SdOrmUtils";
import { QueryUnit } from "../queryable/QueryUnit";
import { QueryHelper } from "../query-builder/QueryHelper";
import { TEntityValue } from "../queryable/types";
import { TQueryBuilderValue } from "../query-builder/types";

export class CaseQueryHelper<T extends TQueryValue> {
  readonly #cases: any[] = [];

  constructor(
    private readonly _qh: QueryHelper,
    private _type: Type<T> | undefined,
  ) {}

  case(
    predicate: TEntityValue<boolean | Boolean> | TQueryBuilderValue,
    then: TEntityValue<T>,
  ): this {
    this._type = SdOrmUtils.getQueryValueType(then) ?? this._type;

    this.#cases.push(
      ...[" WHEN ", this._qh.getQueryValue(predicate), " THEN ", this._qh.getQueryValue(then)],
    );
    return this;
  }

  else(then: TEntityValue<T>): QueryUnit<T> {
    this._type = SdOrmUtils.getQueryValueType(then) ?? this._type;
    return new QueryUnit(this._type, [
      "CASE ",
      ...this.#cases,
      " ELSE ",
      this._qh.getQueryValue(then),
      " END",
    ]);
  }
}
