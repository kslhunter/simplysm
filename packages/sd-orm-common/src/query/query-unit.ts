import {Type, WrappedType} from "@simplysm/sd-core-common";

export class QueryUnit<T> {
  constructor(readonly type: Type<T | WrappedType<T>> | undefined,
                     private readonly _query: any) {
  }

  get query(): any {
    return this._query;
  }

  notNull(): QueryUnit<NonNullable<T>> {
    return this as any;
  }

  nullable(): QueryUnit<T | undefined> {
    return this as any;
  }
}
