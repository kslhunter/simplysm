import "@simplysm/core-common";
import { defineDbContext } from "../../src/define-db-context";
import { createDbContext } from "../../src/create-db-context";
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

export const TestDbDef = defineDbContext({
  tables: {
    company: Company,
    user: User,
    post: Post,
    sales: Sales,
    monthlySales: MonthlySales,
    employee: Employee,
  },
  views: {
    activeUsers: ActiveUsers,
    userSummary: UserSummary,
  },
  procedures: {
    getUserById: GetUserById,
    getAllUsers: GetAllUsers,
  },
});

export function createTestDb() {
  return createDbContext(TestDbDef, new MockExecutor(), {
    database: "TestDb",
    schema: "TestSchema",
  });
}

// Type alias for backward compatibility with view definitions
export type TestDbContext = ReturnType<typeof createTestDb>;
