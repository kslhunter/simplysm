import {QueryBuilderAdv} from "@simplism/orm-query";
import {Type} from "@simplism/core";

export class Queryable<D, T> extends QueryBuilderAdv<T> {
  public constructor(private readonly _db: D,
                     public readonly modelType: Type<T>) {
    super(modelType);
  }

  public async insertAsync(obj: T): Promise<T> {
    throw new Error("미구현");
  }

  public async resultAsync(): Promise<T[]> {
    throw new Error("미구현");
  }
}