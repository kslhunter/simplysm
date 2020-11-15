import { Type, TypeWrap } from "@simplysm/sd-core-common";

export class QueryUnit<T> {
  public T!: T;

  public constructor(public readonly type: Type<T | TypeWrap<T>> | undefined,
                     private readonly _query: any) {
  }

  public get query(): any {
    return this._query;
  }

  public notNull(): QueryUnit<NonNullable<T>> {
    return this as any;
  }
}