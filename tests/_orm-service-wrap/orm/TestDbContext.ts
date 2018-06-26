import {DbContext} from "@simplism/service-interface";
import {Queryable} from "../../../packages/service-interface/src/orm/Queryable";
import {TestModel} from "./TestModel";
import {IDbConnectionConfig} from "@simplism/orm-common";

export class TestDbContext extends DbContext {
  public testModel = new Queryable(this, TestModel);

  public get config(): IDbConnectionConfig {
    return {
      username: "sa",
      password: "1234"
    };
  }
}