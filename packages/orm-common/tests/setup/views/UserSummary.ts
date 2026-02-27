import { View } from "../../../src/schema/view-builder";
import type { TestDbTablesContext } from "../TestDbContext";

// view for user summary info (includes select)
export const UserSummary = View("UserSummary").query((db: TestDbTablesContext) =>
  db.user().select((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  })),
);
