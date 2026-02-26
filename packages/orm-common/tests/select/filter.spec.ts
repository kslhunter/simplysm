import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./filter.expected";

//#region ========== 비교 연산 ==========

describe("SELECT - WHERE - comparison operations", () => {
  describe("eq (equal)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.eq(item.id, 1)])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereEq[dialect]);
    });
  });

  describe("not eq (not equal)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.not(expr.eq(item.id, 1))])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "not",
            arg: {
              type: "eq",
              source: { type: "column", path: ["T1", "id"] },
              target: { type: "value", value: 1 },
            },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereNotEq[dialect]);
    });
  });

  describe("gt (greater than)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.gt(item.age, 20)])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "gt",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 20 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereGt[dialect]);
    });
  });

  describe("gte (greater than or equal)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.gte(item.age, 20)])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "gte",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 20 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereGte[dialect]);
    });
  });

  describe("lt (less than)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.lt(item.age, 30)])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "lt",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 30 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereLt[dialect]);
    });
  });

  describe("lte (less than or equal)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.lte(item.age, 30)])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "lte",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 30 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereLte[dialect]);
    });
  });
});

//#endregion

//#region ========== NULL 체크 ==========

describe("SELECT - WHERE - NULL check", () => {
  describe("null", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.null(item.email)])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "null",
            arg: { type: "column", path: ["T1", "email"] },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereNull[dialect]);
    });
  });

  describe("not null", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.not(expr.null(item.email))])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "not",
            arg: {
              type: "null",
              arg: { type: "column", path: ["T1", "email"] },
            },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereNotNull[dialect]);
    });
  });
});

//#endregion

//#region ========== IN ==========

describe("SELECT - WHERE - IN", () => {
  describe("in", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.in(item.id, [1, 2, 3])])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "in",
            source: { type: "column", path: ["T1", "id"] },
            values: [
              { type: "value", value: 1 },
              { type: "value", value: 2 },
              { type: "value", value: 3 },
            ],
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereIn[dialect]);
    });
  });

  describe("not in", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.not(expr.in(item.id, [1, 2]))])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "not",
            arg: {
              type: "in",
              source: { type: "column", path: ["T1", "id"] },
              values: [
                { type: "value", value: 1 },
                { type: "value", value: 2 },
              ],
            },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereNotIn[dialect]);
    });
  });
});

//#endregion

//#region ========== LIKE ==========

describe("SELECT - WHERE - LIKE", () => {
  describe("like", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.like(item.name, "%Hong%")])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "like",
            source: { type: "column", path: ["T1", "name"] },
            pattern: { type: "value", value: "%Hong%" },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereLike[dialect]);
    });
  });

  describe("not like", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.not(expr.like(item.name, "%Test%"))])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "not",
            arg: {
              type: "like",
              source: { type: "column", path: ["T1", "name"] },
              pattern: { type: "value", value: "%Test%" },
            },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereNotLike[dialect]);
    });
  });
});

//#endregion

//#region ========== 논리 연산 ==========

describe("SELECT - WHERE - logical operations", () => {
  describe("다중 조건 (AND)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.eq(item.isActive, true), expr.gt(item.age, 20)])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "isActive"] },
            target: { type: "value", value: true },
          },
          {
            type: "gt",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 20 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereMultipleAnd[dialect]);
    });
  });

  describe("or condition", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.or([expr.eq(item.age, 20), expr.eq(item.age, 30)])])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "or",
            conditions: [
              {
                type: "eq",
                source: { type: "column", path: ["T1", "age"] },
                target: { type: "value", value: 20 },
              },
              {
                type: "eq",
                source: { type: "column", path: ["T1", "age"] },
                target: { type: "value", value: 30 },
              },
            ],
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereOr[dialect]);
    });
  });

  describe("and condition (explicit)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.and([expr.gt(item.age, 20), expr.lt(item.age, 30)])])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "and",
            conditions: [
              {
                type: "gt",
                source: { type: "column", path: ["T1", "age"] },
                target: { type: "value", value: 20 },
              },
              {
                type: "lt",
                source: { type: "column", path: ["T1", "age"] },
                target: { type: "value", value: 30 },
              },
            ],
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereAndExplicit[dialect]);
    });
  });

  it("연속 where (AND 결합)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.eq(item.isActive, true)])
      .where((item) => [expr.gt(item.age, 20)])
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "User" },
      where: [
        {
          type: "eq",
          source: { type: "column", path: ["T1", "isActive"] },
          target: { type: "value", value: true },
        },
        {
          type: "gt",
          source: { type: "column", path: ["T1", "age"] },
          target: { type: "value", value: 20 },
        },
      ],
    });
  });
});

//#endregion

//#region ========== BETWEEN ==========

describe("SELECT - WHERE - BETWEEN", () => {
  describe("between", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.between(item.age, 20, 30)])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "between",
            source: { type: "column", path: ["T1", "age"] },
            from: { type: "value", value: 20 },
            to: { type: "value", value: 30 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereBetween[dialect]);
    });
  });
});

//#endregion

//#region ========== EXISTS / IN subquery ==========

describe("SELECT - WHERE - EXISTS / IN subquery", () => {
  describe("exists", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.exists(db.post().where((p) => [expr.eq(p.userId, item.id)]))])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "exists",
            query: {
              type: "select",
              as: "T2",
              from: { database: "TestDb", schema: "TestSchema", name: "Post" },
              where: [
                {
                  type: "eq",
                  source: { type: "column", path: ["T2", "userId"] },
                  target: { type: "column", path: ["T1", "id"] },
                },
              ],
            },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereExists[dialect]);
    });
  });

  it("not exists - QueryDef 검증", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [
        expr.not(expr.exists(db.post().where((p) => [expr.eq(p.userId, item.id)]))),
      ])
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "User" },
      where: [
        {
          type: "not",
          arg: {
            type: "exists",
            query: {
              type: "select",
              as: "T2",
              from: { database: "TestDb", schema: "TestSchema", name: "Post" },
              where: [
                {
                  type: "eq",
                  source: { type: "column", path: ["T2", "userId"] },
                  target: { type: "column", path: ["T1", "id"] },
                },
              ],
            },
          },
        },
      ],
    });
  });

  describe("inQuery (IN subquery)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [
        expr.inQuery(
          item.id,
          db.post().select((p) => ({ userId: p.userId })),
        ),
      ])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "inQuery",
            source: { type: "column", path: ["T1", "id"] },
            query: {
              type: "select",
              as: "T2",
              from: { database: "TestDb", schema: "TestSchema", name: "Post" },
              select: {
                userId: { type: "column", path: ["T2", "userId"] },
              },
            },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereInQuery[dialect]);
    });
  });
});

//#endregion

//#region ========== SEARCH ==========

describe("SELECT - SEARCH", () => {
  it("단일 검색어 - 단일 column", () => {
    const db = createTestDb();
    const def = db
      .post()
      .search((item) => [item.title], "Apple")
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      where: [
        {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "title"] },
                  },
                  pattern: { type: "value", value: "%apple%" },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("다중 검색어 (OR)", () => {
    const db = createTestDb();
    const def = db
      .post()
      .search((item) => [item.title], "사과 바나나")
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      where: [
        {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [
                {
                  type: "or",
                  conditions: [
                    {
                      type: "like",
                      source: {
                        type: "lower",
                        arg: { type: "column", path: ["T1", "title"] },
                      },
                      pattern: { type: "value", value: "%사과%" },
                    },
                  ],
                },
                {
                  type: "or",
                  conditions: [
                    {
                      type: "like",
                      source: {
                        type: "lower",
                        arg: { type: "column", path: ["T1", "title"] },
                      },
                      pattern: { type: "value", value: "%바나나%" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("구문 검색 (따옴표)", () => {
    const db = createTestDb();
    const def = db
      .post()
      .search((item) => [item.title], '"Delicious Fruit"')
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      where: [
        {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "title"] },
                  },
                  pattern: { type: "value", value: "%delicious fruit%" },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("와일드카드 (*)", () => {
    const db = createTestDb();
    const def = db
      .post()
      .search((item) => [item.title], "test*")
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      where: [
        {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "title"] },
                  },
                  pattern: { type: "value", value: "test%" },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("이스케이프 (\\*)", () => {
    const db = createTestDb();
    const def = db
      .post()
      .search((item) => [item.title], "app\\*")
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      where: [
        {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "title"] },
                  },
                  pattern: { type: "value", value: "%app*%" },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("다중 column 검색 (OR)", () => {
    const db = createTestDb();
    const def = db
      .post()
      .search((item) => [item.title, item.content], "Apple")
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      where: [
        {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "title"] },
                  },
                  pattern: { type: "value", value: "%apple%" },
                },
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "content"] },
                  },
                  pattern: { type: "value", value: "%apple%" },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("제외 검색 (-)", () => {
    const db = createTestDb();
    const def = db
      .post()
      .search((item) => [item.title], "사과 -바나나")
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      where: [
        {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "title"] },
                  },
                  pattern: { type: "value", value: "%사과%" },
                },
              ],
            },
            {
              type: "not",
              arg: {
                type: "or",
                conditions: [
                  {
                    type: "like",
                    source: {
                      type: "lower",
                      arg: { type: "column", path: ["T1", "title"] },
                    },
                    pattern: { type: "value", value: "%바나나%" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
  });

  it("복합 검색 (포함, 제외, 구문)", () => {
    const db = createTestDb();
    const def = db
      .post()
      .search((item) => [item.title, item.content], '사과 "Delicious Fruit" -바나나')
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      where: [
        {
          type: "and",
          conditions: [
            {
              type: "or",
              conditions: [
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "title"] },
                  },
                  pattern: { type: "value", value: "%사과%" },
                },
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "content"] },
                  },
                  pattern: { type: "value", value: "%사과%" },
                },
              ],
            },
            {
              type: "or",
              conditions: [
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "title"] },
                  },
                  pattern: { type: "value", value: "%delicious fruit%" },
                },
                {
                  type: "like",
                  source: {
                    type: "lower",
                    arg: { type: "column", path: ["T1", "content"] },
                  },
                  pattern: { type: "value", value: "%delicious fruit%" },
                },
              ],
            },
            {
              type: "not",
              arg: {
                type: "or",
                conditions: [
                  {
                    type: "like",
                    source: {
                      type: "lower",
                      arg: { type: "column", path: ["T1", "title"] },
                    },
                    pattern: { type: "value", value: "%바나나%" },
                  },
                  {
                    type: "like",
                    source: {
                      type: "lower",
                      arg: { type: "column", path: ["T1", "content"] },
                    },
                    pattern: { type: "value", value: "%바나나%" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
  });

  it("빈 검색어", () => {
    const db = createTestDb();
    const def = db
      .post()
      .search((item) => [item.title], "   ")
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
    });
  });
});

//#endregion
