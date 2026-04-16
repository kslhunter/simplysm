import { describe, expect, expectTypeOf, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { User } from "../setup/models/User";
import { Post } from "../setup/models/Post";
import type { ExprUnit } from "../../src/expr/expr-unit";

describe("QueryableRecord 타입 추론", () => {
  it("optional relation (joinSingle) — NOT NULL 컬럼은 ExprUnit<T>", () => {
    const db = createTestDb();
    const q = db
      .post()
      .joinSingle("user", (qr, c) => qr.from(User).where((u) => [expr.eq(u.id, c.userId)]))
      .select((item) => ({
        title: item.title,
        userName: item.user!.name,
      }));

    type Result = typeof q extends { meta: { columns: infer C } } ? C : never;
    type TitleType = Result extends { title: { $infer: infer T } } ? T : never;
    type UserNameType = Result extends { userName: { $infer: infer T } } ? T : never;

    // title: main table non-nullable → ExprUnit<string>
    expectTypeOf<TitleType>().toEqualTypeOf<string>();
    // userName: optional relation의 non-nullable 컬럼 → ExprUnit<string> (nullable 전파 없음)
    expectTypeOf<UserNameType>().toEqualTypeOf<string>();

    expect(q).toBeDefined();
  });

  it("optional relation (joinSingle) — nullable 컬럼은 ExprUnit<T | undefined>", () => {
    const db = createTestDb();
    const q = db
      .post()
      .joinSingle("user", (qr, c) => qr.from(User).where((u) => [expr.eq(u.id, c.userId)]))
      .select((item) => ({
        userEmail: item.user!.email,
      }));

    type Result = typeof q extends { meta: { columns: infer C } } ? C : never;
    type UserEmailType = Result extends { userEmail: { $infer: infer T } } ? T : never;

    // email: 스키마 nullable → ExprUnit<string | undefined> (스키마 nullability 유지)
    expectTypeOf<UserEmailType>().toEqualTypeOf<string | undefined>();

    expect(q).toBeDefined();
  });

  it("optional 배열 relation (join) — 요소의 NOT NULL 컬럼은 ExprUnit<T>", () => {
    const db = createTestDb();

    db.user()
      .join("posts", (qr, c) => qr.from(Post).where((p) => [expr.eq(p.userId, c.id)]))
      .select((item) => {
        const posts = item.posts!;
        void posts;

        type PostElement = (typeof posts)[number];
        type TitleType = PostElement["title"] extends ExprUnit<infer T> ? T : never;

        // 배열 relation 요소의 non-nullable 컬럼 → ExprUnit<string>
        expectTypeOf<TitleType>().toEqualTypeOf<string>();

        return { id: item.id };
      });
  });

  it("non-optional FK relation — QueryableRecord로 매핑 (변경 전후 동일)", () => {
    const db = createTestDb();

    // Post.userId는 NOT NULL → user relation은 non-optional
    // User에서 company relation은 optional (companyId nullable)
    db.user()
      .join("posts", (qr, c) => qr.from(Post).where((p) => [expr.eq(p.userId, c.id)]))
      .select((item) => {
        const posts = item.posts!;
        void posts;

        type PostElement = (typeof posts)[number];
        type UserType = PostElement["user"];

        // non-optional FK relation의 내부 컬럼도 스키마 그대로
        type UserNameType = NonNullable<UserType> extends { name: ExprUnit<infer T> }
          ? T
          : never;
        expectTypeOf<UserNameType>().toEqualTypeOf<string>();

        return { id: item.id };
      });
  });

  it("non-optional 배열 relation — QueryableRecord<T>[] (변경 전후 동일)", () => {
    const db = createTestDb();

    db.company()
      .select((item) => {
        // Company.users는 foreignKeyTarget → 배열 relation (InferDeepRelations에서 optional)
        const users = item.users!;
        void users;
        type UserElement = (typeof users)[number];
        type NameType = UserElement["name"] extends ExprUnit<infer T> ? T : never;

        expectTypeOf<NameType>().toEqualTypeOf<string>();

        return { id: item.id };
      });
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

    type Result = typeof q extends { meta: { columns: infer C } } ? C : never;
    type IdType = Result extends { id: { $infer: infer T } } ? T : never;
    type EmailType = Result extends { email: { $infer: infer T } } ? T : never;

    expectTypeOf<IdType>().toEqualTypeOf<number>();
    expectTypeOf<EmailType>().toEqualTypeOf<string | undefined>();

    expect(q).toBeDefined();
  });
});
