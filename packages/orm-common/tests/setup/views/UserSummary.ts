import { View } from "../../../src/schema/view-builder";
import type { TestDbContext } from "../TestDbContext";

// 사용자 요약 정보 뷰 (select 포함)
export const UserSummary = View("UserSummary").query((db: TestDbContext) =>
  db.user().select((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  })),
);
