import { DbContext, queryable, TDialect } from "@simplysm/orm-common";
import { TDbConnConf } from "../src";
import { TestUser } from "./models/TestUser";
import { TestOrder } from "./models/TestOrder";
import { TestCompany } from "./models/TestCompany";
import { TestSales } from "./models/TestSales";
import { TestMonthlySales } from "./models/TestMonthlySales";
import { TestUserBackup } from "./models/TestUserBackup";

export const DIALECTS: TDialect[] = ["mysql", "postgresql", "mssql"];

export function getConfig(dialect: TDialect): TDbConnConf {
  switch (dialect) {
    case "mysql":
      return {
        dialect: "mysql",
        host: "localhost",
        port: 23306,
        username: "root",
        password: "test",
        database: "TestDb",
      };
    case "postgresql":
      return {
        dialect: "postgresql",
        host: "localhost",
        port: 25432,
        username: "test",
        password: "test",
        database: "TestDb",
      };
    case "mssql": {
      return {
        dialect: "mssql",
        host: "localhost",
        port: 21433,
        username: "sa",
        password: "YourStrong@Passw0rd",
        database: "TestDb",
      };
    }
  }
}

export class TestDbContext extends DbContext {
  testCompany = queryable(this, TestCompany);
  testUser = queryable(this, TestUser);
  testOrder = queryable(this, TestOrder);
  testSales = queryable(this, TestSales);
  testMonthlySales = queryable(this, TestMonthlySales);
  testUserBackup = queryable(this, TestUserBackup);
}
