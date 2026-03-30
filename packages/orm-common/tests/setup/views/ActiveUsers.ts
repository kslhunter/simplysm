import { View } from "../../../src/schema/view-builder";
import { expr } from "../../../src/expr/expr";
import type { TestDbTablesContext } from "../TestDbContext";

// view showing only active users
export const ActiveUsers = View("ActiveUsers").query((db: TestDbTablesContext) =>
  db.user().where((u) => [expr.eq(u.isActive, true)]),
);
