import {Type} from "../../core/src";

export class DbQueryUnit<T> {
  private readonly _generic!: T; // tslint:disable-line:no-unused-variable

  public get query(): string {
    return this._query;
  }

  public get type(): Type<T> {
    return this._type;
  }

  public constructor(private readonly _type: Type<T>,
                     private readonly _query: string) {
  }
}