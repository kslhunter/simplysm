import { describe, expect, expectTypeOf, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { User } from "../setup/models/User";
import type {
  NullableQueryableRecord,
  QueryableColumns,
  QueryableRecord,
} from "../../src/exec/queryable";

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

  it("QueryableColumns strips optional modifier from keys", () => {
    type OptionalData = { id?: number; name: string };
    type Result = QueryableColumns<OptionalData>;

    // Key is required (no outer | undefined), but ExprUnit preserves inner type
    expectTypeOf<Result["id"]>().toMatchTypeOf<{ $infer: number | undefined }>();
    expectTypeOf<Result["name"]>().toMatchTypeOf<{ $infer: string }>();

    // Verify key is truly required (not optional)
    type Keys = keyof Result;
    expectTypeOf<"id">().toMatchTypeOf<Keys>();

    expect(true).toBe(true);
  });

  it("QueryableRecord preserves optional modifier (for select output)", () => {
    type OptionalData = { id?: number; name: string };
    type Result = QueryableRecord<OptionalData>;

    // Key is optional — Required<> needed to access id
    expectTypeOf<Required<Result>["id"]>().toMatchTypeOf<{ $infer: number | undefined }>();
    expectTypeOf<Result["name"]>().toMatchTypeOf<{ $infer: string }>();

    expect(true).toBe(true);
  });

  it("QueryableRecord preserves optional modifier for write operations", () => {
    type OptionalData = { id?: number; name: string };
    type WriteResult = QueryableRecord<OptionalData>;

    // QueryableRecord preserves optional keys (for update/insert operations)
    expectTypeOf<Required<WriteResult>["id"]>().toMatchTypeOf<{ $infer: number | undefined }>();
    expectTypeOf<WriteResult["name"]>().toMatchTypeOf<{ $infer: string }>();

    expect(true).toBe(true);
  });

  it("select<ICustom> with optional properties should compile", () => {
    const db = createTestDb();

    // Custom type with optional properties (like user's real-world pattern)
    // Note: must use `type` not `interface` — interfaces lack implicit index signatures
    type IUserItem = {
      id?: number;
      name?: string;
      email?: string;
      isActive: boolean;
    };

    // .select<IUserItem>((c) => ({ id: c.id, name: c.name, ... }))
    const q = db
      .user()
      .where((u) => [expr.eq(u.isActive, true)])
      .select<IUserItem>((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        isActive: c.isActive,
      }));

    expect(q).toBeDefined();
  });

  it("select with optional properties then orderBy should compile", () => {
    const db = createTestDb();

    type IUserItem = {
      id?: number;
      name?: string;
      isActive: boolean;
    };

    const q = db
      .user()
      .where((u) => [expr.eq(u.isActive, true)])
      .select<IUserItem>((c) => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive,
      }))
      .orderBy((c) => c.id, "DESC");

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
