import { describe, expect, expectTypeOf, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { User } from "../setup/models/User";

describe("NullableQueryableRecord 타입 추론", () => {
  it("optional relation (joinSingle) fields should be ExprUnit<T | undefined>", () => {
    const db = createTestDb();
    const q = db
      .post()
      .joinSingle("user", (qr, c) => qr.from(User).where((u) => [expr.eq(u.id, c.userId)]))
      .select((item) => ({
        title: item.title,
        userName: item.user!.name,
      }));

    // title is from the main table — should remain non-nullable
    type Result = typeof q extends { meta: { columns: infer C } } ? C : never;
    type TitleType = Result extends { title: { $infer: infer T } } ? T : never;
    type UserNameType = Result extends { userName: { $infer: infer T } } ? T : never;

    expectTypeOf<TitleType>().toEqualTypeOf<string>();
    expectTypeOf<UserNameType>().toEqualTypeOf<string | undefined>();

    // Runtime: query builds without error
    expect(q).toBeDefined();
  });

  it("select auto-infers result type from callback return", () => {
    const db = createTestDb();

    const q = db
      .user()
      .where((u) => [expr.eq(u.isActive, true)])
      .select((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        isActive: c.isActive,
      }));

    // UnwrapQueryableRecord extracts primitive types from ExprUnit
    type Result = typeof q extends { meta: { columns: infer C } } ? C : never;
    type IdType = Result extends { id: { $infer: infer T } } ? T : never;
    type EmailType = Result extends { email: { $infer: infer T } } ? T : never;

    expectTypeOf<IdType>().toEqualTypeOf<number>();
    expectTypeOf<EmailType>().toEqualTypeOf<string | undefined>();

    expect(q).toBeDefined();
  });

});
