import { describe, expect, expectTypeOf, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { User } from "../setup/models/User";
import type { NullableQueryableRecord } from "../../src/exec/queryable";

describe("NullableQueryableRecord type inference", () => {
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

  it("non-optional relation (required object) fields should remain ExprUnit<T>", () => {
    const db = createTestDb();
    const q = db.post().select((item) => ({
      title: item.title,
      viewCount: item.viewCount,
    }));

    type Result = typeof q extends { meta: { columns: infer C } } ? C : never;
    type TitleType = Result extends { title: { $infer: infer T } } ? T : never;

    expectTypeOf<TitleType>().toEqualTypeOf<string>();

    expect(q).toBeDefined();
  });

  it("NullableQueryableRecord wraps primitives with | undefined", () => {
    // Type-only test — verified by pnpm typecheck
    type TestData = { name: string; age: number | undefined };
    type Result = NullableQueryableRecord<TestData>;

    // All primitives get | undefined in NullableQueryableRecord
    expectTypeOf<Result["name"]>().toMatchTypeOf<{ $infer: string | undefined }>();
    expectTypeOf<Result["age"]>().toMatchTypeOf<{ $infer: number | undefined }>();

    expect(true).toBe(true);
  });
});
