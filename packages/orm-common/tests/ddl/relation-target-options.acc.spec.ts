import { describe, expect, it } from "vitest";
import { createRelationFactory } from "../../src/schema/factory/relation-builder";
import { Table } from "../../src/schema/table-builder";

const User = Table("User")
  .columns((c) => ({
    id: c.bigint(),
    name: c.varchar(100),
  }))
  .primaryKey("id")
  .relations(() => ({}));

const Post = Table("Post")
  .columns((c) => ({
    id: c.bigint(),
    userId: c.bigint(),
  }))
  .primaryKey("id")
  .relations(() => ({}));

describe("Target 빌더 options 파라미터", () => {
  describe("foreignKeyTarget options", () => {
    const factory = createRelationFactory(() => Post);

    it("description을 options로 설정한다", () => {
      const builder = factory.foreignKeyTarget(() => User, "user", {
        description: "게시글",
      });
      expect(builder.meta.description).toBe("게시글");
    });

    it("single을 options로 설정한다", () => {
      const builder = factory.foreignKeyTarget(() => User, "user", { single: true });
      expect(builder.meta.isSingle).toBe(true);
    });

    it("description과 single을 동시에 설정한다", () => {
      const builder = factory.foreignKeyTarget(() => User, "user", {
        description: "프로필",
        single: true,
      });
      expect(builder.meta.description).toBe("프로필");
      expect(builder.meta.isSingle).toBe(true);
    });

    it("options를 생략한다", () => {
      const builder = factory.foreignKeyTarget(() => User, "user");
      expect(builder.meta.description).toBeUndefined();
      expect(builder.meta.isSingle).toBeUndefined();
    });
  });

  describe("relationKeyTarget options", () => {
    const factory = createRelationFactory(() => Post);

    it("description을 options로 설정한다", () => {
      const builder = factory.relationKeyTarget(() => User, "user", {
        description: "게시글",
      });
      expect(builder.meta.description).toBe("게시글");
    });

    it("single을 options로 설정한다", () => {
      const builder = factory.relationKeyTarget(() => User, "user", { single: true });
      expect(builder.meta.isSingle).toBe(true);
    });

    it("options를 생략한다", () => {
      const builder = factory.relationKeyTarget(() => User, "user");
      expect(builder.meta.description).toBeUndefined();
      expect(builder.meta.isSingle).toBeUndefined();
    });
  });

  describe("Target 빌더에서 체이닝 메서드 제거", () => {
    const factory = createRelationFactory(() => Post);

    it("ForeignKeyTargetBuilder에 description 메서드가 없다", () => {
      const builder = factory.foreignKeyTarget(() => User, "user");
      expect((builder as unknown as Record<string, unknown>)["description"]).toBeUndefined();
    });

    it("ForeignKeyTargetBuilder에 single 메서드가 없다", () => {
      const builder = factory.foreignKeyTarget(() => User, "user");
      expect((builder as unknown as Record<string, unknown>)["single"]).toBeUndefined();
    });

    it("RelationKeyTargetBuilder에 description과 single 메서드가 없다", () => {
      const builder = factory.relationKeyTarget(() => User, "user");
      expect((builder as unknown as Record<string, unknown>)["description"]).toBeUndefined();
      expect((builder as unknown as Record<string, unknown>)["single"]).toBeUndefined();
    });
  });
});
