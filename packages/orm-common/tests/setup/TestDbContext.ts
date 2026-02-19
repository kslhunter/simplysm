import "@simplysm/core-common";
import type { DbContextInstance } from "../../src/types/db-context-def";
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

// Tables-only definition (used by view definitions to break circular reference)
// eslint-disable-next-line unused-imports/no-unused-vars -- used in typeof for TestDbTablesContext type
const TestDbTablesDef = defineDbContext({
  tables: {
    company: Company,
    user: User,
    post: Post,
    sales: Sales,
    monthlySales: MonthlySales,
    employee: Employee,
  },
});

/** Type for view definitions — references tables only, avoids circular dependency */
export type TestDbTablesContext = DbContextInstance<typeof TestDbTablesDef>;

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

export type TestDbContext = ReturnType<typeof createTestDb>;
