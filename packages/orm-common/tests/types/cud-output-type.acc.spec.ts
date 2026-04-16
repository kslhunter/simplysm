import { describe, expectTypeOf, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";

describe("CUD outputColumns 반환 타입 추론", () => {
  it("delete에서 outputColumns 지정 시 원시 타입을 반환해야 한다", async () => {
    const db = createTestDb();

    const results = await db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .delete(["id", "name"]);

    expectTypeOf(results).toEqualTypeOf<{ id: number; name: string }[]>();
  });

  it("update에서 outputColumns 지정 시 원시 타입을 반환해야 한다", async () => {
    const db = createTestDb();

    const results = await db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .update(() => ({ name: expr.val("string", "updated") }), ["id", "name"]);

    expectTypeOf(results).toEqualTypeOf<{ id: number; name: string }[]>();
  });

  it("insert는 기존대로 올바른 원시 타입을 반환해야 한다", async () => {
    const db = createTestDb();

    const results = await db
      .employee()
      .insert([{ name: "Alice" }], ["id", "name"]);

    expectTypeOf(results).toEqualTypeOf<{ id: number; name: string }[]>();
  });
});
