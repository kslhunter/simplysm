import {TestModel} from "./TestModel";
import {IDbConnectionConfig} from "@simplism/orm-common";
import {DbContext, Queryable} from "@simplism/orm-service-wrap";

export class TestDbContext extends DbContext {
  public testModel = new Queryable(this, TestModel);

  public get config(): IDbConnectionConfig {
    return {
      username: "sa",
      password: "1234"
    };
  }
}