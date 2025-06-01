import { TQueryValue } from "../types";
import { Type } from "@simplysm/sd-core-common";
import { SdOrmUtils } from "../utils/sd-orm.utils";
import { QueryUnit } from "./query-unit";
import { QueryHelper } from "./query-helper";
import { TEntityValue } from "./queryable.types";

export class CaseWhenQueryHelper<T extends TQueryValue> {
  readonly #cases: any[] = [];
  #type: Type<T> | undefined = undefined;

  constructor(
    private readonly _qh: QueryHelper,
    private readonly _arg: TEntityValue<TQueryValue>,
  ) {
  }

  when(arg: TEntityValue<TQueryValue>, then: TEntityValue<T>): CaseWhenQueryHelper<T> {
    this.#type = SdOrmUtils.getQueryValueType(then) ?? this.#type;
    this.#cases.push(...[
      " WHEN ",
      this._qh.getQueryValue(this._qh.equal(this._arg, arg)),
      " THEN ",
      this._qh.getQueryValue(then),
    ]);
    return this as any;
  }

  else(then: TEntityValue<T>): QueryUnit<T> {
    this.#type = SdOrmUtils.getQueryValueType(then) ?? this.#type;
    return new QueryUnit(
      this.#type,
      ["CASE ", ...this.#cases, " ELSE ", this._qh.getQueryValue(then), " END"],
    );
  }
}
