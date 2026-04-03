import { describe, expect, it } from "vitest";
import { Table } from "../../src/schema/table-builder";

describe("복합 순환 참조에서 TS7022 미발생", () => {
  it("3테이블 다중 경로 순환 + description option", () => {
    const User = Table("User")
      .columns((c) => ({
        id: c.bigint().autoIncrement(),
        name: c.varchar(100),
        companyId: c.bigint().nullable(),
      }))
      .primaryKey("id")
      .relations((r) => ({
        company: r.foreignKey(["companyId"], () => Company),
        posts: r.foreignKeyTarget(() => Post, "user", { description: "게시글목록" }),
      }));

    const Post = Table("Post")
      .columns((c) => ({
        id: c.bigint().autoIncrement(),
        userId: c.bigint(),
      }))
      .primaryKey("id")
      .relations((r) => ({
        user: r.foreignKey(["userId"], () => User),
      }));

    const Company = Table("Company")
      .columns((c) => ({
        id: c.bigint().autoIncrement(),
        name: c.varchar(200),
      }))
      .primaryKey("id")
      .relations((r) => ({
        users: r.foreignKeyTarget(() => User, "company"),
      }));

    // 타입이 any가 아닌 올바른 TableBuilder인지 검증
    expect(User.meta.name).toBe("User");
    expect(Post.meta.name).toBe("Post");
    expect(Company.meta.name).toBe("Company");
  });

  it("3테이블 다중 경로 순환 + single option", () => {
    const User = Table("User")
      .columns((c) => ({
        id: c.bigint().autoIncrement(),
        name: c.varchar(100),
        companyId: c.bigint().nullable(),
      }))
      .primaryKey("id")
      .relations((r) => ({
        company: r.foreignKey(["companyId"], () => Company),
        latestPost: r.foreignKeyTarget(() => Post, "user", { single: true }),
      }));

    const Post = Table("Post")
      .columns((c) => ({
        id: c.bigint().autoIncrement(),
        userId: c.bigint(),
      }))
      .primaryKey("id")
      .relations((r) => ({
        user: r.foreignKey(["userId"], () => User),
      }));

    const Company = Table("Company")
      .columns((c) => ({
        id: c.bigint().autoIncrement(),
        name: c.varchar(200),
      }))
      .primaryKey("id")
      .relations((r) => ({
        users: r.foreignKeyTarget(() => User, "company"),
      }));

    expect(User.meta.name).toBe("User");
    expect(Post.meta.name).toBe("Post");
    expect(Company.meta.name).toBe("Company");
  });
});
