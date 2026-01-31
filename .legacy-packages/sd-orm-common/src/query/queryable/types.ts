import type { QueryUnit } from "./QueryUnit";
import type { DbContext } from "../../DbContext";
import type { Queryable } from "./Queryable";
import type { WrappedType } from "@simplysm/sd-core-common";
import type { TQueryValue } from "../../types";
import type { IJoinQueryDef, ISelectQueryDef, TQueryBuilderValue } from "../query-builder/types";

export type TEntityValue<T extends TQueryValue> = T | QueryUnit<T>;
export type TEntityValueOrQueryable<D extends DbContext, T extends TQueryValue> =
  | TEntityValue<T>
  | Queryable<D, T>;
export type TEntityValueOrQueryableOrArray<D extends DbContext, T extends TQueryValue> =
  | TEntityValueOrQueryable<D, T>
  | TEntityValueOrQueryableOrArray<D, T>[];

export type TEntity<T> = {
  [K in keyof T]-?: T[K] extends TQueryValue
    ? QueryUnit<T[K]>
    : T[K] extends (infer A)[]
      ? TEntity<A>[]
      : TEntity<T[K]>;
};

export type TSelectEntity<T> = {
  [K in keyof T]: T[K] extends TQueryValue
    ? QueryUnit<T[K]>
    : T[K] extends (infer A)[]
      ? TEntity<A>[]
      : TEntity<T[K]>;
};

export type TEntityUnwrap<T> = {
  [K in keyof T]: T[K] extends QueryUnit<infer A>
    ? A
    : T[K] extends (infer A)[]
      ? TEntityUnwrap<A>[]
      : T[K] extends TQueryValue
        ? T[K]
        : TEntityUnwrap<T[K]> | undefined;
};

export type TIncludeEntity<T> = {
  [K in keyof T]-?: T[K] extends TQueryValue
    ? QueryUnit<T[K]>
    : T[K] extends (infer A)[]
      ? TIncludeEntity<A>[]
      : TIncludeEntity<T[K]>;
};

export interface IQueryableDef {
  from: string | ISelectQueryDef | ISelectQueryDef[];
  join?: (IJoinQueryDef & { isSingle: boolean })[];
  distinct?: true;
  where?: TQueryBuilderValue[];
  top?: number;
  groupBy?: TQueryBuilderValue[];
  having?: TQueryBuilderValue[];
  orderBy?: [TQueryBuilderValue, "ASC" | "DESC"][];
  limit?: [number, number];
  pivot?: {
    valueColumn: TQueryBuilderValue;
    pivotColumn: TQueryBuilderValue;
    pivotKeys: string[];
  };
  unpivot?: {
    valueColumn: TQueryBuilderValue;
    pivotColumn: TQueryBuilderValue;
    pivotKeys: string[];
  };
  lock?: boolean;
  sample?: number;
}

export type TQueryValuePropertyNames<T> = {
  [K in keyof T]: undefined extends T[K] ? never : T[K] extends TQueryValue ? K : never;
}[keyof T];
export type TUndefinedPropertyNames<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export type TOnlyQueryValueProperty<T> = Pick<T, TQueryValuePropertyNames<T>> &
  Partial<Pick<T, TUndefinedPropertyNames<T>>>;

export type TInsertObject<T> = TOnlyQueryValueProperty<T>;
export type TUpdateObject<T> = TOnlyQueryValueProperty<{
  [K in keyof T]?: T[K] | QueryUnit<T[K]> | QueryUnit<WrappedType<T[K]>>;
}>;
