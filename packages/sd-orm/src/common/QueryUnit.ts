import { Type, WrappedType } from "@simplysm/sd-core/common";

export class QueryUnit<T> {
  public T!: T;

  public constructor(public readonly type: Type<T | WrappedType<T>> | undefined,
                     private readonly _query: any) {
  }

  public get query(): any {
    return this._query;
  }

  public notNull(): QueryUnit<NonNullable<T>> {
    return this as any;
  }

  public nullable(): QueryUnit<T | undefined> {
    return this as any;
  }
}
