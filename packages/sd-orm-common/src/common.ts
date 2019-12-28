import {DateOnly, DateTime, Time, TypeWrap, Uuid} from "@simplysm/sd-core-common";
import {QueryUnit} from "./query/QueryUnit";
import {ISelectQueryDef} from "./query-definition";
import {Queryable} from "./query/Queryable";

export type TQueryValue =
  undefined
  | boolean
  | number
  | string
  | Number
  | String
  | Boolean
  | DateOnly
  | DateTime
  | Time
  | Uuid
  | Buffer;

export type TQueryValueArray = (TQueryValue | TQueryValueArray)[];

export type TQueryValueOrSelect = TQueryValue | ISelectQueryDef;
export type TQueryValueOrSelectArray = (TQueryValueOrSelect | TQueryValueOrSelectArray)[];

export type TEntityValue<T extends TQueryValue> = T | QueryUnit<T, any>;
export type TEntityValueArray = (TEntityValue<TQueryValue> | TEntityValueArray)[];

export type TEntityValueOrQueryable = TEntityValue<any> | Queryable<any, any>;
export type TEntityValueOrQueryableArray = (TEntityValueOrQueryable | TEntityValueOrQueryableArray)[];

export type TEntity<T> = {
  [K in keyof T]-?:
  T[K] extends QueryUnit<any, any> ? QueryUnit<T[K]["T"], T[K]["query"]>
    : T[K] extends TQueryValue ? QueryUnit<TypeWrap<T[K]>, any>
    : TEntity<T[K]>
};