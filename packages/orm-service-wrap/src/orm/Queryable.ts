import {QueryBuilderAdv} from "@simplism/orm-query";
import {Type} from "@simplism/core";
import {DbContext} from "./DbContext";

export class Queryable<D extends DbContext, T> extends QueryBuilderAdv<T> {
  private readonly _qb: QueryBuilderAdv<T>;

  public constructor(private readonly _db: D,
                     public readonly modelType: Type<T>) {
    super(modelType);
    this._qb = new QueryBuilderAdv(modelType);
  }

  public async insertAsync(obj: T): Promise<T> {
    const query = this._qb.insert(obj).query;
    const result = await this._db.executeAsync(query);
    return result[0][0];
  }

  public async resultAsync(): Promise<T[]> {
    const query = this._qb.query;
    const result = await this._db.executeAsync(query);
    return result[0];
  }
}