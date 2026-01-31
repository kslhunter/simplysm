import { View } from "../../../src/schema/view-builder";
import { expr } from "../../../src/expr/expr";
import type { TestDbContext } from "../TestDbContext";

// 활성 사용자만 보여주는 뷰
export const ActiveUsers = View("ActiveUsers").query((db: TestDbContext) =>
  db.user().where((u) => [expr.eq(u.isActive, true)]),
);
