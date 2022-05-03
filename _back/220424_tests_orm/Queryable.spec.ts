import { expect } from "chai";
import { Column, DbContext, ForeignKey, IDbMigration, Queryable, QueryUnit, Table } from "@simplysm/sd-orm-common";
import { NodeDbContextExecutor } from "@simplysm/sd-orm-node";
import { Type } from "@simplysm/sd-core-common";
import * as sinon from "sinon";
import { expectThrowAsync } from "../../lib/expectThrowAsync";

@Table({ description: "테스트 테이블", database: "TestDb", schema: "TestSchema" })
class TestTable {
  @Column({ description: "아이디", primaryKey: 1, autoIncrement: true })
  public id?: number;

  @Column({ description: "명칭" })
  public name!: string;

  @Column({ description: "상위_아이디", nullable: true })
  public parentId?: number;

  @ForeignKey(["parentId"], () => TestTable, "상위")
  public parent?: TestTable;
}

class TestDbContext extends DbContext {
  public override get migrations(): Type<IDbMigration>[] {
    return [];
  }

  public test = new Queryable(this, TestTable);
}

const db = new TestDbContext(
  new NodeDbContextExecutor({
    dialect: "mssql",
    host: "localhost",
    port: 1433,
    username: "sa",
    password: "1234"
  }),
  {
    dialect: "mssql",
    database: "TestDb", schema: "TestSchema"
  }
);

const sinonDbExecuteDefsAsyncFn = sinon.spy((defs, options) => {
  return [];
});
// @ts-expect-error
db.executeDefsAsync = sinonDbExecuteDefsAsyncFn;

describe("(common) orm.Queryable (QueryableDef => QueryDef)", () => {
  describe("SELECT", () => {
    it("기본적으로 테이블을 조회한다", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await db.test.resultAsync();

      expect(sinonDbExecuteDefsAsyncFn.args[0]).deep.equal([
        [{
          type: "select",
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]",
            "[parentId]": "[TBL].[parentId]"
          }
        }],
        [{
          columns: {
            id: { dataType: "Number" },
            name: { dataType: "String" },
            parentId: { dataType: "Number" }
          },
          joins: {}
        }]
      ]);
    });

    it("SELECT", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await db.test
        .select((item) => ({
          id1: item.id
        }))
        .resultAsync();

      expect(sinonDbExecuteDefsAsyncFn.args[0]).deep.equal([
        [{
          type: "select",
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id1]": "[TBL].[id]"
          }
        }],
        [{
          columns: {
            id1: { dataType: "Number" }
          },
          joins: {}
        }]
      ]);
    });

    it("SELECT 안에 서브쿼리를 넣을 경우, 내부쿼리는 반드시 TOP 1 이 설정되어야 하고, 단 하나의 컬럼만 SELECT 되어야 한다.", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await expectThrowAsync(
        async () => {
          await db.test
            .select((item) => ({
              id1: new QueryUnit(String, db.test)
            }))
            .resultAsync();
        },
        (err) => {
          expect(err).match(/TOP 1/);
        }
      );

      await expectThrowAsync(
        async () => {
          await db.test
            .select((item) => ({
              id1: new QueryUnit(String, db.test.top(1))
            }))
            .resultAsync();
        },
        (err) => {
          expect(err).match(/하나/);
        }
      );
    });

    it("SELECT 안에 서브쿼리를 넣을 수 있다.", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await db.test
        .select((item) => ({
          id1: new QueryUnit(String, db.test.top(1).select((item1) => ({ id2: item1.id })))
        }))
        .resultAsync();

      expect(sinonDbExecuteDefsAsyncFn.args[0]).deep.equal([
        [{
          type: "select",
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id1]": {
              from: "[TestDb].[TestSchema].[TestTable]",
              as: "[TBL]",
              select: {
                "[id2]": "[TBL].[id]"
              },
              top: 1
            }
          }
        }],
        [{
          columns: {
            id1: { dataType: "String" }
          },
          joins: {}
        }]
      ]);
    });

    it("WRAP: 기존 Queryable 이 FROM 안에 서브 쿼리로 들어간다.", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await db.test.wrap().resultAsync();

      expect(sinonDbExecuteDefsAsyncFn.args[0]).deep.equal([
        [{
          type: "select",
          from: {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL]",
            select: {
              "[id]": "[TBL].[id]",
              "[name]": "[TBL].[name]",
              "[parentId]": "[TBL].[parentId]"
            }
          },
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]",
            "[parentId]": "[TBL].[parentId]"
          }
        }],
        [{
          columns: {
            id: { dataType: "Number" },
            name: { dataType: "String" },
            parentId: { dataType: "Number" }
          },
          joins: {}
        }]
      ]);
    });

    it("FROM 안에 다수의 서브쿼리를 넣어 UNION ALL 할 수 있다.", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await Queryable.union([
        db.test,
        db.test,
        db.test
      ]).resultAsync();

      expect(sinonDbExecuteDefsAsyncFn.args[0]).deep.equal([
        [{
          type: "select",
          from: [
            {
              from: {
                as: "[TBL]",
                from: "[TestDb].[TestSchema].[TestTable]",
                select: {
                  "[id]": "[TBL].[id]",
                  "[name]": "[TBL].[name]",
                  "[parentId]": "[TBL].[parentId]"
                }
              },
              as: "[TBL]",
              select: {
                "[id]": "[TBL].[id]",
                "[name]": "[TBL].[name]",
                "[parentId]": "[TBL].[parentId]"
              }
            },
            {
              from: {
                as: "[TBL]",
                from: "[TestDb].[TestSchema].[TestTable]",
                select: {
                  "[id]": "[TBL].[id]",
                  "[name]": "[TBL].[name]",
                  "[parentId]": "[TBL].[parentId]"
                }
              },
              as: "[TBL]",
              select: {
                "[id]": "[TBL].[id]",
                "[name]": "[TBL].[name]",
                "[parentId]": "[TBL].[parentId]"
              }
            },
            {
              from: {
                as: "[TBL]",
                from: "[TestDb].[TestSchema].[TestTable]",
                select: {
                  "[id]": "[TBL].[id]",
                  "[name]": "[TBL].[name]",
                  "[parentId]": "[TBL].[parentId]"
                }
              },
              as: "[TBL]",
              select: {
                "[id]": "[TBL].[id]",
                "[name]": "[TBL].[name]",
                "[parentId]": "[TBL].[parentId]"
              }
            }
          ],
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]",
            "[parentId]": "[TBL].[parentId]"
          }
        }],
        [{
          columns: {
            id: { dataType: "Number" },
            name: { dataType: "String" },
            parentId: { dataType: "Number" }
          },
          joins: {}
        }]
      ]);
    });

    it("WHERE", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await db.test
        .where((item) => [
          db.qh.equal(item.id, undefined),
          db.qh.equal(item.id, 3)
        ]).resultAsync();

      expect(sinonDbExecuteDefsAsyncFn.args[0]).deep.equal([
        [{
          type: "select",
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]",
            "[parentId]": "[TBL].[parentId]"
          },
          where: [
            ["[TBL].[id]", " IS ", "NULL"],
            " AND ",
            ["[TBL].[id]", " = ", 3]
          ]
        }],
        [{
          columns: {
            id: { dataType: "Number" },
            name: { dataType: "String" },
            parentId: { dataType: "Number" }
          },
          joins: {}
        }]
      ]);
    });

    it("WHERE 안에 서브쿼리를 넣을 경우, 내부쿼리는 반드시 TOP 1 이 설정되어야 하고, 단 하나의 컬럼만 SELECT 되어야 한다.", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await expectThrowAsync(
        async () => {
          await db.test
            .where((item) => [
              db.qh.equal(item.id, new QueryUnit<number>(Number, new Queryable(db, TestTable)))
            ])
            .resultAsync();
        },
        (err) => {
          expect(err).match(/TOP 1/);
        }
      );

      await expectThrowAsync(
        async () => {
          await db.test
            .where((item) => [
              db.qh.equal(item.id, new QueryUnit<number>(Number, new Queryable(db, TestTable).top(1)))
            ])
            .resultAsync();
        },
        (err) => {
          expect(err).match(/하나/);
        }
      );
    });

    it("WHERE 안에 서브쿼리를 넣을 수 있다.", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await db.test
        .where((item) => [
          db.qh.equal(item.id, new QueryUnit<number>(Number, db.test.top(1).select((item1) => ({ id: item1.id }))))
        ])
        .resultAsync();

      expect(sinonDbExecuteDefsAsyncFn.args[0]).deep.equal([
        [{
          type: "select",
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]",
            "[parentId]": "[TBL].[parentId]"
          },
          where: [
            [
              [
                ["[TBL].[id]", " IS ", "NULL"],
                " AND ",
                [
                  {
                    from: "[TestDb].[TestSchema].[TestTable]",
                    as: "[TBL]",
                    select: {
                      "[id]": "[TBL].[id]"
                    },
                    top: 1
                  },
                  " IS ",
                  "NULL"
                ]
              ],
              " OR ",
              [
                "[TBL].[id]",
                " = ",
                {
                  from: "[TestDb].[TestSchema].[TestTable]",
                  as: "[TBL]",
                  select: {
                    "[id]": "[TBL].[id]"
                  },
                  top: 1
                }
              ]
            ]
          ]
        }],
        [{
          columns: {
            id: { dataType: "Number" },
            name: { dataType: "String" },
            parentId: { dataType: "Number" }
          },
          joins: {}
        }]
      ]);
    });

    it("DISTINCT", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await db.test
        .distinct()
        .resultAsync();

      expect(sinonDbExecuteDefsAsyncFn.args[0]).deep.equal([
        [{
          type: "select",
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]",
            "[parentId]": "[TBL].[parentId]"
          },
          distinct: true
        }],
        [{
          columns: {
            id: { dataType: "Number" },
            name: { dataType: "String" },
            parentId: { dataType: "Number" }
          },
          joins: {}
        }]
      ]);
    });

    it("TOP", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await db.test
        .top(10)
        .resultAsync();

      expect(sinonDbExecuteDefsAsyncFn.args[0]).deep.equal([
        [{
          type: "select",
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]",
            "[parentId]": "[TBL].[parentId]"
          },
          top: 10
        }],
        [{
          columns: {
            id: { dataType: "Number" },
            name: { dataType: "String" },
            parentId: { dataType: "Number" }
          },
          joins: {}
        }]
      ]);
    });

    it("ORDER BY", async () => {
      sinonDbExecuteDefsAsyncFn.resetHistory();

      await db.test
        .orderBy((item) => item.id)
        .resultAsync();


      expect(sinonDbExecuteDefsAsyncFn.args[0]).deep.equal([
        [{
          type: "select",
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]",
            "[parentId]": "[TBL].[parentId]"
          },
          orderBy: [
            ["[TBL].[id]", "ASC"]
          ]
        }],
        [{
          columns: {
            id: { dataType: "Number" },
            name: { dataType: "String" },
            parentId: { dataType: "Number" }
          },
          joins: {}
        }]
      ]);
    });

    it("LIMIT 작업은 반드시 ORDER BY 와 함께 쓰여야 한다.", () => {
      expect.fail("미변경");

      expect(() => {
        db.test
          .limit(1, 2)
          .getSelectQueryDef();
      }).to.throw(/ORDER BY/);
    });

    it("LIMIT", () => {
      expect(
        db.test
          .orderBy((item) => item.id)
          .limit(1, 2)
          .getSelectQueryDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[parentId]": "[TBL].[parentId]"
        },
        limit: [1, 2],
        orderBy: [
          ["[TBL].[id]", "ASC"]
        ]
      });
    });

    it("GROUP BY", () => {
      expect(
        db.test
          .groupBy((item) => [
            item.id,
            item.name
          ])
          .getSelectQueryDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[parentId]": "[TBL].[parentId]"
        },
        groupBy: [
          "[TBL].[id]",
          "[TBL].[name]"
        ]
      });
    });

    it("HAVING 작업은 반드시 GROUP BY 와 함께 쓰여야 한다.", () => {
      expect(() => {
        db.test
          .having((item) => [
            db.qh.equal(item.id, 1)
          ])
          .getSelectQueryDef();
      }).to.throw(/GROUP BY/);
    });

    it("HAVING", () => {
      expect(
        db.test
          .groupBy((item) => [
            item.id,
            item.name
          ])
          .having((item) => [
            db.qh.equal(item.id, 1)
          ])
          .getSelectQueryDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[parentId]": "[TBL].[parentId]"
        },
        groupBy: [
          "[TBL].[id]",
          "[TBL].[name]"
        ],
        having: [
          ["[TBL].[id]", " = ", 1]
        ]
      });
    });

    it("JOIN", () => {
      expect(
        db.test
          .join(TestTable, "test", (qr, item) => qr)
          .getSelectQueryDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[parentId]": "[TBL].[parentId]",
          "[test.id]": "[TBL.test].[id]",
          "[test.name]": "[TBL.test].[name]",
          "[test.parentId]": "[TBL.test].[parentId]"
        },
        join: [
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL.test]",
            isCustomSelect: false,
            select: {
              "[id]": "[TBL.test].[id]",
              "[name]": "[TBL.test].[name]",
              "[parentId]": "[TBL.test].[parentId]"
            }
          }
        ]
      });
    });

    it("JOIN 된 테이블에 대해 SELECT 를 재구성 할 수 있다.", () => {
      expect(
        db.test
          .join(TestTable, "tests", (qr, item) => qr)
          .select((item) => ({
            id: item.id,
            tt: item.tests.map((item1) => ({
              id1: item1.id
            }))
          }))
          .getSelectQueryDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[tt.id1]": "[TBL.tests].[id]"
        },
        join: [
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL.tests]",
            isCustomSelect: false,
            select: {
              "[id]": "[TBL.tests].[id]",
              "[name]": "[TBL.tests].[name]",
              "[parentId]": "[TBL.tests].[parentId]"
            }
          }
        ]
      });
    });

    it("JOIN 시, UNION ALL 사용이 가능하다.", () => {
      expect(
        db.test
          .join(
            [
              db.test, db.test, db.test
            ],
            "test",
            (qr, item) => qr
          )
          .getSelectQueryDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[parentId]": "[TBL].[parentId]",
          "[test.id]": "[TBL.test].[id]",
          "[test.name]": "[TBL.test].[name]",
          "[test.parentId]": "[TBL.test].[parentId]"
        },
        join: [
          {
            from: [
              {
                from: {
                  as: "[TBL]",
                  from: "[TestDb].[TestSchema].[TestTable]",
                  select: {
                    "[id]": "[TBL].[id]",
                    "[name]": "[TBL].[name]",
                    "[parentId]": "[TBL].[parentId]"
                  }
                },
                as: "[TBL]",
                select: {
                  "[id]": "[TBL].[id]",
                  "[name]": "[TBL].[name]",
                  "[parentId]": "[TBL].[parentId]"
                }
              },
              {
                from: {
                  as: "[TBL]",
                  from: "[TestDb].[TestSchema].[TestTable]",
                  select: {
                    "[id]": "[TBL].[id]",
                    "[name]": "[TBL].[name]",
                    "[parentId]": "[TBL].[parentId]"
                  }
                },
                as: "[TBL]",
                select: {
                  "[id]": "[TBL].[id]",
                  "[name]": "[TBL].[name]",
                  "[parentId]": "[TBL].[parentId]"
                }
              },
              {
                from: {
                  as: "[TBL]",
                  from: "[TestDb].[TestSchema].[TestTable]",
                  select: {
                    "[id]": "[TBL].[id]",
                    "[name]": "[TBL].[name]",
                    "[parentId]": "[TBL].[parentId]"
                  }
                },
                as: "[TBL]",
                select: {
                  "[id]": "[TBL].[id]",
                  "[name]": "[TBL].[name]",
                  "[parentId]": "[TBL].[parentId]"
                }
              }
            ],
            as: "[TBL.test]",
            isCustomSelect: false,
            select: {
              "[id]": "[TBL.test].[id]",
              "[name]": "[TBL.test].[name]",
              "[parentId]": "[TBL.test].[parentId]"
            }
          }
        ]
      });
    });

    it("JOIN 후 WRAPPING 시 SELECT 가 재구성 된다.", () => {
      expect(
        db.test
          .join(TestTable, "test", (qr, item) => qr)
          .wrap()
          .getSelectQueryDef()
      ).to.deep.equal({
        from: {
          from: "[TestDb].[TestSchema].[TestTable]",
          as: "[TBL]",
          select: {
            "[id]": "[TBL].[id]",
            "[name]": "[TBL].[name]",
            "[parentId]": "[TBL].[parentId]",
            "[test.id]": "[TBL.test].[id]",
            "[test.name]": "[TBL.test].[name]",
            "[test.parentId]": "[TBL.test].[parentId]"
          },
          join: [
            {
              from: "[TestDb].[TestSchema].[TestTable]",
              as: "[TBL.test]",
              isCustomSelect: false,
              select: {
                "[id]": "[TBL.test].[id]",
                "[name]": "[TBL.test].[name]",
                "[parentId]": "[TBL.test].[parentId]"
              }
            }
          ]
        },
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[parentId]": "[TBL].[parentId]",
          "[test.id]": "[TBL].[test.id]",
          "[test.name]": "[TBL].[test.name]",
          "[test.parentId]": "[TBL].[test.parentId]"
        }
      });
    });

    it("INCLUDE", () => {
      expect(
        db.test
          .include((item) => item.parent)
          .getSelectQueryDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[parentId]": "[TBL].[parentId]",
          "[parent.id]": "[TBL.parent].[id]",
          "[parent.name]": "[TBL.parent].[name]",
          "[parent.parentId]": "[TBL.parent].[parentId]"
        },
        join: [
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL.parent]",
            isCustomSelect: false,
            select: {
              "[id]": "[TBL.parent].[id]",
              "[name]": "[TBL.parent].[name]",
              "[parentId]": "[TBL.parent].[parentId]"
            },
            where: [
              [
                [["[TBL.parent].[id]", " IS ", "NULL"], " AND ", ["[TBL].[parentId]", " IS ", "NULL"]],
                " OR ",
                ["[TBL.parent].[id]", " = ", "[TBL].[parentId]"]
              ]
            ]
          }
        ]
      });
    });

    it("복수 아이템을 위한 JOIN 을 하고나면, LIMIT 이 불가능하다", () => {
      expect(() => {
        db.test
          .join(TestTable, "test", (qr, item) => qr)
          .orderBy((item) => item.id)
          .limit(1, 2)
          .getSelectQueryDef();
      }).to.throw(/다수/);
    });

    it("단일 아이템을 위한 JOIN 을 하고나선, LIMIT 이 가능하다", () => {
      expect(() => {
        db.test
          .joinSingle(TestTable, "test", (qr, en) => qr)
          .orderBy((item) => item.id)
          .limit(1, 2)
          .getSelectQueryDef();
      }).to.not.throw();
    });

    it("SEARCH", () => {
      expect(
        db.test
          .search((item) => [db.qh.cast(item.id, String), item.name], "!!")
          .getSelectQueryDef()
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        select: {
          "[id]": "[TBL].[id]",
          "[name]": "[TBL].[name]",
          "[parentId]": "[TBL].[parentId]"
        },
        where: [
          [
            [
              [
                ["CONVERT(", "NVARCHAR(255)", ", ", "[TBL].[id]", ")"],
                " LIKE ",
                ["N'%'", " + ", "N'!!'", " + ", "N'%'"]
              ],
            ],
            " OR ",
            [
              ["[TBL].[name]", " LIKE ", ["N'%'", " + ", "N'!!'", " + ", "N'%'"]]
            ]
          ]
        ]
      });
    });
  });

  describe("INSERT", () => {
    it("사용가능한 서비스 외의 다른 서비스 사용시 오류가 발생된다.", () => {
      expect(() => {
        db.test
          .wrap()
          .getInsertQueryDef({
            name: "홍길동"
          }, undefined);
      }).to.throw(/TABLE/);

      expect(() => {
        db.test
          .select((item) => ({
            id: item.id,
            name: item.name
          }))
          .getInsertQueryDef({
            name: "홍길동"
          }, undefined);
      }).to.throw(/SELECT/);

      expect(() => {
        db.test
          .where((item) => [db.qh.equal(item.id, 1)])
          .getInsertQueryDef({ name: "홍길동" }, undefined);
      }).to.throw(/WHERE/);

      expect(() => {
        db.test
          .distinct()
          .getInsertQueryDef({ name: "홍길동" }, undefined);
      }).to.throw(/DISTINCT/);

      expect(() => {
        db.test
          .top(10)
          .getInsertQueryDef({ name: "홍길동" }, undefined);
      }).to.throw(/TOP/);

      expect(() => {
        db.test
          .orderBy((item) => item.id)
          .getInsertQueryDef({ name: "홍길동" }, undefined);
      }).to.throw(/ORDER BY/);

      expect(() => {
        db.test
          .limit(1, 10)
          .getInsertQueryDef({ name: "홍길동" }, undefined);
      }).to.throw(/LIMIT/);

      expect(() => {
        db.test
          .groupBy((item) => [item.id])
          .getInsertQueryDef({ name: "홍길동" }, undefined);
      }).to.throw(/GROUP BY/);

      expect(() => {
        db.test
          .having((item) => [db.qh.equal(item.id, 1)])
          .getInsertQueryDef({ name: "홍길동" }, undefined);
      }).to.throw(/HAVING/);

      expect(() => {
        db.test
          .join(TestTable, "tests", (qr, en) => qr)
          .getInsertQueryDef({ name: "홍길동" }, undefined);
      }).to.throw(/JOIN/);
    });

    it("기본적으로 테이블에 데이터를 입력한다.", () => {
      expect(
        db.test.getInsertQueryDef({
          name: "홍길동"
        }, undefined)
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        record: {
          "[name]": "N'홍길동'"
        }
      });
    });

    it("데이터를 입력시 입력 결과로 반환받을 컬럼을 설정할 수 있다.", () => {
      expect(
        db.test.getInsertQueryDef({
          name: "홍길동"
        }, ["id", "name"])
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["[id]", "[name]"],
        record: {
          "[name]": "N'홍길동'"
        }
      });
    });
  });

  describe("UPDATE", () => {
    it("사용가능한 서비스 외의 다른 서비스 사용시 오류가 발생된다.", () => {
      expect(() => {
        db.test
          .wrap()
          .getUpdateQueryDef(
            { id: 1, name: "홍길동" },
            undefined
          );
      }).to.throw(/TABLE/);

      expect(() => {
        db.test
          .select((item) => ({
            id: item.id,
            name: item.name
          }))
          .getUpdateQueryDef(
            { id: 1, name: "홍길동" },
            undefined
          );
      }).to.throw(/SELECT/);

      expect(() => {
        db.test
          .orderBy((item) => item.id)
          .getUpdateQueryDef(
            { id: 1, name: "홍길동" },
            undefined
          );
      }).to.throw(/ORDER BY/);

      expect(() => {
        db.test
          .limit(1, 10)
          .getUpdateQueryDef(
            { id: 1, name: "홍길동" },
            undefined
          );
      }).to.throw(/LIMIT/);

      expect(() => {
        db.test
          .groupBy((item) => [item.id])
          .getUpdateQueryDef(
            { id: 1, name: "홍길동" },
            undefined
          );
      }).to.throw(/GROUP BY/);

      expect(() => {
        db.test
          .having((item) => [db.qh.equal(item.id, 1)])
          .getUpdateQueryDef(
            { id: 1, name: "홍길동" },
            undefined
          );
      }).to.throw(/HAVING/);
    });

    it("기본적으로 테이블 데이터를 수정한다.", () => {
      expect(
        db.test
          .getUpdateQueryDef((item) => ({
            id: 1,
            name: item.name
          }), undefined)
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        record: {
          "[id]": 1,
          "[name]": "[TBL].[name]"
        }
      });
    });

    it("데이터를 수정시 수정 결과로 반환받을 컬럼을 설정할 수 있다.", () => {
      expect(
        db.test
          .getUpdateQueryDef((item) => ({
            id: 1,
            name: item.name
          }), ["id", "name"])
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["[id]", "[name]"],
        as: "[TBL]",
        record: {
          "[id]": 1,
          "[name]": "[TBL].[name]"
        }
      });
    });

    it("TOP", () => {
      expect(
        db.test
          .top(1)
          .getUpdateQueryDef((item) => ({
            id: 1,
            name: item.name
          }), undefined)
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        record: {
          "[id]": 1,
          "[name]": "[TBL].[name]"
        },
        top: 1
      });
    });

    it("WHERE", () => {
      expect(
        db.test
          .where((item) => [db.qh.equal(item.id, 1)])
          .getUpdateQueryDef((item) => ({
            id: 1,
            name: item.name
          }), undefined)
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        record: {
          "[id]": 1,
          "[name]": "[TBL].[name]"
        },
        where: [
          ["[TBL].[id]", " = ", 1]
        ]
      });
    });

    it("JOIN 하여, WHERE 로 조건을 지정하거나, update 할 데이터를 지정할 수 있다.", () => {
      expect(
        db.test
          .join(TestTable, "test", (qr, en) => qr)
          .where((item) => [db.qh.equal(item.id, item.test[0].id)])
          .getUpdateQueryDef((item) => ({
            id: 1,
            name: db.qh.ifNull(item.test[0].name, "")
          }), undefined)
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        join: [
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL.test]",
            isCustomSelect: false,
            select: {
              "[id]": "[TBL.test].[id]",
              "[name]": "[TBL.test].[name]",
              "[parentId]": "[TBL.test].[parentId]"
            }
          }
        ],
        record: {
          "[id]": 1,
          "[name]": "[TBL.test].[name]"
        },
        where: [
          [
            [
              ["[TBL].[id]", " IS ", "NULL"],
              " AND ",
              ["[TBL.test].[id]", " IS ", "NULL"]
            ],
            " OR ",
            ["[TBL].[id]", " = ", "[TBL.test].[id]"]
          ]
        ]
      });
    });
  });

  describe("UPSERT", () => {
    it("사용가능한 서비스 외의 다른 서비스 사용시 오류가 발생된다.", () => {
      expect(() => {
        db.test
          .wrap()
          .getUpsertQueryDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          }, undefined);
      }).to.throw(/TABLE/);

      expect(() => {
        db.test
          .select((item) => ({
            id: item.id,
            name: item.name
          }))
          .getUpsertQueryDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          }, undefined);
      }).to.throw(/SELECT/);

      expect(() => {
        db.test
          .distinct()
          .getInsertQueryDef({ name: "홍길동" }, undefined);
      }).to.throw(/DISTINCT/);

      expect(() => {
        db.test
          .top(10)
          .getUpsertQueryDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          }, undefined);
      }).to.throw(/TOP/);

      expect(() => {
        db.test
          .orderBy((item) => item.id)
          .getUpsertQueryDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          }, undefined);
      }).to.throw(/ORDER BY/);

      expect(() => {
        db.test
          .limit(1, 10)
          .getUpsertQueryDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          }, undefined);
      }).to.throw(/LIMIT/);

      expect(() => {
        db.test
          .groupBy((item) => [item.id])
          .getUpsertQueryDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          }, undefined);
      }).to.throw(/GROUP BY/);

      expect(() => {
        db.test
          .having((item) => [db.qh.equal(item.id, 1)])
          .getUpsertQueryDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          }, undefined);
      }).to.throw(/HAVING/);

      expect(() => {
        db.test
          .join(TestTable, "tests", (qr, en) => qr)
          .getUpsertQueryDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          }, undefined);
      }).to.throw(/JOIN/);
    });

    it("WHERE 문을 반드시 지정해야 한다.", () => {
      expect(() => {
        db.test
          .getUpsertQueryDef({
            name: "홍길동1"
          }, {
            name: "홍길동2"
          }, undefined);
      }).to.throw(/WHERE/);
    });

    it("기본적으로 테이블 데이터를 수정하며, WHERE 문에 부합하는 데이터가 없으면 INSERT 한다.", () => {
      expect(
        db.test
          .where((item) => [db.qh.equal(item.id, 1)])
          .getUpsertQueryDef((item) => ({
            name: item.name
          }), {
            name: "홍길동2"
          }, undefined)
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: `[TBL]`,
        where: [
          ["[TBL].[id]", " = ", 1]
        ],
        updateRecord: {
          "[name]": "[TBL].[name]"
        },
        insertRecord: {
          "[name]": "N'홍길동2'"
        }
      });
    });
  });

  describe("DELETE", () => {
    it("사용가능한 서비스 외의 다른 서비스 사용시 오류가 발생된다.", () => {
      expect(() => {
        db.test
          .wrap()
          .getDeleteQueryDef(undefined);
      }).to.throw(/TABLE/);

      expect(() => {
        db.test
          .select((item) => ({
            id: item.id,
            name: item.name
          }))
          .getDeleteQueryDef(undefined);
      }).to.throw(/SELECT/);

      expect(() => {
        db.test
          .distinct()
          .getDeleteQueryDef(undefined);
      }).to.throw(/DISTINCT/);

      expect(() => {
        db.test
          .orderBy((item) => item.id)
          .getDeleteQueryDef(undefined);
      }).to.throw(/ORDER BY/);

      expect(() => {
        db.test
          .limit(1, 10)
          .getDeleteQueryDef(undefined);
      }).to.throw(/LIMIT/);

      expect(() => {
        db.test
          .groupBy((item) => [item.id])
          .getDeleteQueryDef(undefined);
      }).to.throw(/GROUP BY/);

      expect(() => {
        db.test
          .having((item) => [db.qh.equal(item.id, 1)])
          .getDeleteQueryDef(undefined);
      }).to.throw(/HAVING/);
    });

    it("기본적으로 테이블 데이터를 삭제한다.", () => {
      expect(
        db.test
          .getDeleteQueryDef(undefined)
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["*"],
        as: "[TBL]"
      });
    });

    it("OUTPUT", () => {
      expect(
        db.test.getDeleteQueryDef(["id"])
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        output: ["[id]"],
        as: "[TBL]"
      });
    });

    it("WHERE", () => {
      expect(
        db.test
          .where((item) => [db.qh.equal(item.id, 1)])
          .getDeleteQueryDef(undefined)
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        where: [
          ["[TBL].[id]", " = ", 1]
        ]
      });
    });

    it("TOP", () => {
      expect(
        db.test
          .top(10)
          .getDeleteQueryDef(undefined)
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        top: 10
      });
    });

    it("JOIN + WHERE", () => {
      expect(
        db.test
          .join(TestTable, "test", (qr, en) => qr)
          .where((item) => [db.qh.equal(item.id, item.test[0].id)])
          .getDeleteQueryDef(undefined)
      ).to.deep.equal({
        from: "[TestDb].[TestSchema].[TestTable]",
        as: "[TBL]",
        join: [
          {
            from: "[TestDb].[TestSchema].[TestTable]",
            as: "[TBL.test]",
            isCustomSelect: false,
            select: {
              "[id]": "[TBL.test].[id]",
              "[name]": "[TBL.test].[name]",
              "[parentId]": "[TBL.test].[parentId]"
            }
          }
        ],
        where: [
          [
            [
              ["[TBL].[id]", " IS ", "NULL"],
              " AND ",
              ["[TBL.test].[id]", " IS ", "NULL"]
            ],
            " OR ",
            ["[TBL].[id]", " = ", "[TBL.test].[id]"]
          ]
        ]
      });
    });
  });
});
