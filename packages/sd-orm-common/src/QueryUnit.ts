import {StripTypeWrap, Type} from "@simplysm/sd-core-common";

export class QueryUnit<T> {
  public T?: StripTypeWrap<T>;

  public constructor(public readonly type: Type<T> | undefined,
                     private readonly _query: any) {
  }

  public get query(): any {
    return this._query;
  }
}