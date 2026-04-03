import "@simplysm/core-common";
import { DbContext } from "../../src/db-context";
import { Post } from "./models/Post";
import { Company } from "./models/Company";
import { Sales } from "./models/Sales";
import { MonthlySales } from "./models/MonthlySales";
import { Employee } from "./models/Employee";
import { ActiveUsers } from "./views/ActiveUsers";
import { UserSummary } from "./views/UserSummary";
import { MockExecutor } from "./MockExecutor";
import { User } from "./models/User";
import { GetUserById } from "./procedure/GetUserById";
import { GetAllUsers } from "./procedure/GetAllUsers";

// Tables-only context (used by view definitions to break circular reference)
class TestDbTablesOnly extends DbContext {
  company = this.queryable(Company);
  user = this.queryable(User);
  post = this.queryable(Post);
  sales = this.queryable(Sales);
  monthlySales = this.queryable(MonthlySales);
  employee = this.queryable(Employee);
}

/** Type for view definitions — references tables only, avoids circular dependency */
export type TestDbTablesContext = { [K in keyof TestDbTablesOnly]: TestDbTablesOnly[K] };

class TestDb extends DbContext {
  company = this.queryable(Company);
  user = this.queryable(User);
  post = this.queryable(Post);
  sales = this.queryable(Sales);
  monthlySales = this.queryable(MonthlySales);
  employee = this.queryable(Employee);

  activeUsers = this.queryable(ActiveUsers);
  userSummary = this.queryable(UserSummary);

  getUserById = this.executable(GetUserById);
  getAllUsers = this.executable(GetAllUsers);
}

export function createTestDb() {
  return new TestDb(new MockExecutor(), {
    database: "TestDb",
    schema: "TestSchema",
  });
}

export type TestDbContext = TestDb;
