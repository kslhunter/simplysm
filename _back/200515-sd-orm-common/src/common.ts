import {DateOnly, DateTime, StripTypeWrap, Time, Uuid} from "@simplysm/sd-core-common";
import {QueryUnit} from "./query/QueryUnit";
import {ISelectQueryDef} from "./query-definition";
import {Queryable} from "./query/Queryable";

export type TQueryValue =
  undefined
  | number
  | string
  | boolean
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

export type TQueryValueTypeWrap<T> = T extends string ? String
  : T extends number ? Number
    : T extends boolean ? Boolean
      : T;

export type TEntity<T> = {
  [K in keyof T]-?:
  T[K] extends QueryUnit<any, any> ? QueryUnit<T[K]["T"], T[K]["query"]>
    // : T[K] extends TQueryValue ? QueryUnit<TQueryValueTypeWrap<T[K]>, any>
    : T[K] extends TQueryValue ? QueryUnit<T[K], any>
    : TEntity<T[K]>
};

export type StripObjectTypeWrap<T> = {
  [K in keyof T]: T[K] extends TQueryValue ? StripTypeWrap<T[K]> : StripObjectTypeWrap<T[K]>
};
