import { describe, expectTypeOf, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";

describe("CUD outputColumns 반환 타입 — nullable 컬럼", () => {
  it("delete에서 nullable 컬럼 지정 시 T | undefined 타입을 반환해야 한다", async () => {
    const db = createTestDb();

    const results = await db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .delete(["managerId"]);

    expectTypeOf(results).toEqualTypeOf<{ managerId: number | undefined }[]>();
  });

  it("update에서 nullable 컬럼 지정 시 T | undefined 타입을 반환해야 한다", async () => {
    const db = createTestDb();

    const results = await db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .update(() => ({ name: expr.val("string", "updated") }), ["managerId"]);

    expectTypeOf(results).toEqualTypeOf<{ managerId: number | undefined }[]>();
  });
});
