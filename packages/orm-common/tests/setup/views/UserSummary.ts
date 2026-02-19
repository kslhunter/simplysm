import { View } from "../../../src/schema/view-builder";
import type { TestDbTablesContext } from "../TestDbContext";

// 사용자 요약 정보 뷰 (select 포함)
export const UserSummary = View("UserSummary").query((db: TestDbTablesContext) =>
  db.user().select((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  })),
);
