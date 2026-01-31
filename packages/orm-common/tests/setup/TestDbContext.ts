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
import { executable } from "../../src/exec/executable";
import { GetUserById } from "./procedure/GetUserById";
import { GetAllUsers } from "./procedure/GetAllUsers";
import { queryable } from "../../src/exec/queryable";

export class TestDbContext extends DbContext {
  constructor() {
    super(new MockExecutor(), { database: "TestDb", schema: "TestSchema" });
  }

  // Tables
  company = queryable(this, Company);
  user = queryable(this, User);
  post = queryable(this, Post);
  sales = queryable(this, Sales);
  monthlySales = queryable(this, MonthlySales);
  employee = queryable(this, Employee);

  // Views
  activeUsers = queryable(this, ActiveUsers);
  userSummary = queryable(this, UserSummary);

  // Procedures
  getUserById = executable(this, GetUserById);
  getAllUsers = executable(this, GetAllUsers);
}
