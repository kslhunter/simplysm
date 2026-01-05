/**
 * JOIN 테스트
 * - join() - 1:N 관계
 * - joinSingle() - N:1, 1:1 관계
 * - join with where 조건
 * - join with select
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import { Post } from "./models/Post";
import { User } from "./models/User";
import { Company } from "./models/Company";
import { Order } from "./models/Order";
import * as expected from "./expected/select-join.expected";

describe("SELECT JOIN", () => {
  // ============================================
  // 기본 join (1:N)
  // ============================================
  describe("basic join (1:N)", () => {
    it.each(DIALECTS)("[%s] User -> Posts join", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.join(Post, "posts", (joinQr, parent) =>
        joinQr.where((c) => [db.qh.eq(c.userId, parent.id)]),
      );
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.basicJoin[dialect]);
    });
  });

  // ============================================
  // joinSingle (N:1)
  // ============================================
  describe("joinSingle (N:1)", () => {
    it.each(DIALECTS)("[%s] Post -> User joinSingle", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.post
        .joinSingle(User, "user", (joinQr, parent) =>
          joinQr.where((c) => [db.qh.eq(c.id, parent.userId)]),
        )
        .select((c) => ({
          userName: c.user!.name,
        }));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.joinSingle[dialect]);
    });
  });

  // ============================================
  // join with where (ON 절에 추가 조건)
  // ============================================
  describe("join with where", () => {
    it.each(DIALECTS)("[%s] join with additional where", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.join(Post, "posts", (joinQr, parent) =>
        joinQr.where((c) => [db.qh.eq(c.userId, parent.id), db.qh.gt(c.viewCount, 100)]),
      );
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.joinWithWhere[dialect]);
    });
  });

  // ============================================
  // join with select (join 대상 컬럼 제한)
  // ============================================
  describe("join with select", () => {
    it.each(DIALECTS)("[%s] join with limited columns", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .select((c) => ({
          id: c.id,
          name: c.name,
        }))
        .join(Post, "posts", (joinQr, parent) =>
          // where를 먼저 호출하고 select는 나중에 (userId 참조 유지)
          joinQr
            .where((c) => [db.qh.eq(c.userId, parent.id)])
            .select((c) => ({
              id: c.id,
              title: c.title,
            })),
        );
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.joinWithSelect[dialect]);
    });
  });

  // ============================================
  // 메인 쿼리에 WHERE + join
  // ============================================
  describe("main where with join", () => {
    it.each(DIALECTS)("[%s] where on main query with join", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .where((c) => [db.qh.eq(c.isActive, true)])
        .join(Post, "posts", (joinQr, parent) =>
          joinQr.where((c) => [db.qh.eq(c.userId, parent.id)]),
        );
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.mainWhereWithJoin[dialect]);
    });
  });

  // ============================================
  // join 후 select로 alias 변경
  // ============================================
  describe("join then select", () => {
    it.each(DIALECTS)("[%s] select after join with alias", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .join(Post, "posts", (joinQr, parent) =>
          joinQr.where((c) => [db.qh.eq(c.userId, parent.id)]),
        )
        .select((c) => ({
          userId: c.id,
          userName: c.name,
          postTitle: c.posts[0].title,
        }));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.joinThenSelect[dialect]);
    });
  });

  // ============================================
  // 다단계 JOIN (Post → User → Company)
  // ============================================
  describe("multi-level join", () => {
    it.each(DIALECTS)("[%s] Post -> User -> Company 다단계 JOIN", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      // Post에서 User를 거쳐 Company까지 3단계 JOIN
      const qr = db.post
        .joinSingle(User, "user", (joinQr, parent) =>
          joinQr
            .where((c) => [db.qh.eq(c.id, parent.userId)])
            .joinSingle(Company, "company", (companyQr, userCols) =>
              companyQr.where((c) => [db.qh.eq(c.id, userCols.companyId)]),
            )
            .select((c) => ({
              name: c.name,
              companyName: c.company!.name,
            })),
        )
        .select((c) => ({
          postTitle: c.title,
          userName: c.user!.name,
          companyName: c.user!.companyName,
        }));

      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.multiLevelJoin[dialect]);
    });
  });

  // ============================================
  // 중첩 join - Company -> Users -> Orders
  // ============================================
  describe("nested join (1:N -> 1:N)", () => {
    it.each(DIALECTS)("[%s] Company -> Users -> Orders 중첩 join", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      // Company에서 Users를 join하고, Users 안에서 Orders를 다시 join
      const qr = db.company.join(User, "users", (userQr, companyParent) =>
        userQr
          .where((c) => [db.qh.eq(c.companyId, companyParent.id)])
          .join(Order, "orders", (orderQr, userParent) =>
            orderQr.where((c) => [db.qh.eq(c.userId, userParent.id)]),
          ),
      );

      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.nestedJoin[dialect]);
    });
  });

  // ============================================
  // 중첩 joinSingle - Order -> User -> Company
  // ============================================
  describe("nested joinSingle (N:1 -> N:1)", () => {
    it.each(DIALECTS)("[%s] Order -> User -> Company 중첩 joinSingle", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      // Order에서 User를 joinSingle하고, User 안에서 Company를 다시 joinSingle
      const qr = db.order.joinSingle(User, "user", (userQr, orderParent) =>
        userQr
          .where((c) => [db.qh.eq(c.id, orderParent.userId)])
          .joinSingle(Company, "company", (companyQr, userParent) =>
            companyQr.where((c) => [db.qh.eq(c.id, userParent.companyId)]),
          ),
      );

      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.nestedJoinSingle[dialect]);
    });
  });

  // ============================================
  // 병렬 join - User -> Company, Orders
  // ============================================
  describe("parallel joins", () => {
    it.each(DIALECTS)("[%s] User -> Company (joinSingle), Orders (join) 병렬", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      // User에서 Company를 joinSingle하고, Orders를 join (동일 레벨에서 두 개의 join)
      const qr = db.user
        .joinSingle(Company, "company", (companyQr, userParent) =>
          companyQr.where((c) => [db.qh.eq(c.id, userParent.companyId)]),
        )
        .join(Order, "orders", (orderQr, userParent) =>
          orderQr.where((c) => [db.qh.eq(c.userId, userParent.id)]),
        );

      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.parallelJoins[dialect]);
    });
  });
});
